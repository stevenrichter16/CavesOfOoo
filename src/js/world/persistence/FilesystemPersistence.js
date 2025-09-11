/**
 * FilesystemPersistence - File-based chunk persistence implementation
 * Saves chunks as JSON files with optional gzip compression
 */

import fs from 'fs/promises';
import path from 'path';
import zlib from 'zlib';
import { promisify } from 'util';
import { IChunkPersistence } from './IChunkPersistence.js';
import { PERSISTENCE_CONSTANTS } from '../constants.js';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

/**
 * Filesystem-based persistence implementation
 */
export class FilesystemPersistence extends IChunkPersistence {
  constructor(config = {}) {
    super();
    
    this.baseDir = config.baseDir || './world-data';
    this.compression = config.compression || false;
    this.compressionLevel = config.compressionLevel || PERSISTENCE_CONSTANTS.COMPRESSION_LEVEL;
    this.prettyPrint = config.prettyPrint || false;
    this.atomicWrites = config.atomicWrites !== false;
    this.createBackups = config.createBackups !== false;
    
    // Statistics
    this.stats = {
      totalSaves: 0,
      totalLoads: 0,
      totalDeletes: 0,
      totalBytesWritten: 0,
      totalBytesRead: 0,
      saveErrors: 0,
      loadErrors: 0
    };
    
    // Current version for migration
    this.currentVersion = PERSISTENCE_CONSTANTS.CURRENT_VERSION;
    
    // Ensure base directory exists
    this._ensureDirectory(this.baseDir);
  }
  
  /**
   * Ensure directory exists
   */
  async _ensureDirectory(dir) {
    try {
      await fs.mkdir(dir, { recursive: true });
    } catch (error) {
      if (error.code !== 'EEXIST') {
        throw error;
      }
    }
  }
  
  /**
   * Validate and sanitize seed name
   */
  _validateSeed(seed) {
    if (typeof seed !== 'string') {
      throw new Error('Invalid seed: must be a string');
    }
    
    // Check for null bytes
    if (seed.includes('\x00')) {
      throw new Error('Invalid seed: contains null bytes');
    }
    
    // Check for path traversal attempts
    if (seed.includes('..') || seed.includes('/') || seed.includes('\\')) {
      throw new Error('Invalid seed: contains path traversal characters');
    }
    
    // Check for absolute paths  
    if (path.isAbsolute(seed)) {
      throw new Error('Invalid seed: must not be an absolute path');
    }
    
    // Check length
    if (seed.length > PERSISTENCE_CONSTANTS.MAX_SEED_LENGTH) {
      throw new Error(`Seed name too long: maximum ${PERSISTENCE_CONSTANTS.MAX_SEED_LENGTH} characters`);
    }
    
    // Sanitize: keep only alphanumeric, dash, and underscore
    const sanitized = seed.replace(/[^a-zA-Z0-9\-_]/g, '');
    if (sanitized.length === 0) {
      throw new Error('Invalid seed: must contain valid characters');
    }
    
    return sanitized;
  }
  
  /**
   * Validate coordinates
   */
  _validateCoordinates(cx, cy) {
    if (typeof cx !== 'number' || typeof cy !== 'number') {
      throw new Error('Invalid coordinates: must be numbers');
    }
    
    if (!isFinite(cx) || !isFinite(cy)) {
      throw new Error('Invalid coordinates: must be finite');
    }
    
    if (isNaN(cx) || isNaN(cy)) {
      throw new Error('Invalid coordinates: must not be NaN');
    }
  }
  
  /**
   * Validate chunk structure  
   */
  _validateChunk(chunk) {
    if (!chunk || typeof chunk !== 'object') {
      throw new Error('Invalid chunk: must be an object');
    }
    
    if (typeof chunk.cx !== 'number' || typeof chunk.cy !== 'number') {
      throw new Error('Invalid chunk: coordinates must be numbers');
    }
    
    if (!isFinite(chunk.cx) || !isFinite(chunk.cy)) {
      throw new Error('Invalid chunk: coordinates must be finite');
    }
  }
  
  /**
   * Get file path for a chunk
   */
  _getChunkPath(seed, cx, cy) {
    // Validate and sanitize seed
    const safeSeed = this._validateSeed(seed);
    
    // Validate coordinates
    this._validateCoordinates(cx, cy);
    
    // Handle negative coordinates
    const xStr = cx < 0 ? `${PERSISTENCE_CONSTANTS.NEGATIVE_COORD_PREFIX}${Math.abs(cx)}` : cx.toString();
    const yStr = cy < 0 ? `${PERSISTENCE_CONSTANTS.NEGATIVE_COORD_PREFIX}${Math.abs(cy)}` : cy.toString();
    
    const filename = `${xStr}_${yStr}${PERSISTENCE_CONSTANTS.CHUNK_FILE_EXTENSION}${this.compression ? PERSISTENCE_CONSTANTS.COMPRESSED_EXTENSION : ''}`;
    return path.join(this.baseDir, safeSeed, PERSISTENCE_CONSTANTS.CHUNK_DIR_NAME, filename);
  }
  
  /**
   * Get backup path for a chunk
   */
  _getBackupPath(seed, cx, cy) {
    // Validate and sanitize seed
    const safeSeed = this._validateSeed(seed);
    
    // Validate coordinates
    this._validateCoordinates(cx, cy);
    
    const xStr = cx < 0 ? `${PERSISTENCE_CONSTANTS.NEGATIVE_COORD_PREFIX}${Math.abs(cx)}` : cx.toString();
    const yStr = cy < 0 ? `${PERSISTENCE_CONSTANTS.NEGATIVE_COORD_PREFIX}${Math.abs(cy)}` : cy.toString();
    
    return path.join(this.baseDir, safeSeed, PERSISTENCE_CONSTANTS.BACKUP_DIR_NAME, `${xStr}_${yStr}${PERSISTENCE_CONSTANTS.CHUNK_FILE_EXTENSION}${PERSISTENCE_CONSTANTS.BACKUP_EXTENSION}`);
  }
  
  /**
   * Parse coordinates from filename
   */
  _parseFilename(filename) {
    // Remove extensions
    const base = filename.replace('.json.gz', '').replace('.json', '');
    const parts = base.split('_');
    
    if (parts.length !== 2) return null;
    
    const cx = parts[0].startsWith('n') ? -parseInt(parts[0].slice(1)) : parseInt(parts[0]);
    const cy = parts[1].startsWith('n') ? -parseInt(parts[1].slice(1)) : parseInt(parts[1]);
    
    return { cx, cy };
  }
  
  /**
   * Migrate old chunk format to current version
   */
  _migrateChunk(chunk) {
    // Migrate from old format
    if (chunk.tiles && !chunk.map) {
      chunk.map = chunk.tiles;
      delete chunk.tiles;
    }
    
    // Ensure metadata exists
    if (!chunk.metadata) {
      chunk.metadata = {};
    }
    
    // Update version
    if (chunk.version) {
      chunk.metadata.oldVersion = chunk.version;
      delete chunk.version;
    }
    
    chunk.metadata.version = this.currentVersion;
    chunk.metadata.migratedAt = Date.now();
    
    return chunk;
  }
  
  /**
   * Save a chunk to filesystem
   */
  async save(seed, chunk) {
    // Validate chunk structure
    this._validateChunk(chunk);
    
    const filePath = this._getChunkPath(seed, chunk.cx, chunk.cy);
    const dir = path.dirname(filePath);
    
    try {
      // Ensure directory exists
      await this._ensureDirectory(dir);
      
      // Prepare chunk data
      const chunkData = { ...chunk };
      if (!chunkData.metadata) {
        chunkData.metadata = {};
      }
      chunkData.metadata.version = this.currentVersion;
      chunkData.metadata.savedAt = Date.now();
      
      // Serialize chunk
      const jsonData = this.prettyPrint 
        ? JSON.stringify(chunkData, null, 2)
        : JSON.stringify(chunkData);
      
      let dataToWrite = Buffer.from(jsonData);
      let bytesWritten = dataToWrite.length;
      
      // Compress if enabled
      if (this.compression) {
        dataToWrite = await gzip(dataToWrite, { level: this.compressionLevel });
        bytesWritten = dataToWrite.length;
      }
      
      // Write atomically if enabled
      if (this.atomicWrites) {
        const tempPath = `${filePath}.tmp`;
        await fs.writeFile(tempPath, dataToWrite);
        await fs.rename(tempPath, filePath);
      } else {
        await fs.writeFile(filePath, dataToWrite);
      }
      
      // Update statistics
      this.stats.totalSaves++;
      this.stats.totalBytesWritten += bytesWritten;
      
      return {
        saved: true,
        path: filePath,
        bytesWritten,
        compressed: this.compression
      };
      
    } catch (error) {
      this.stats.saveErrors++;
      
      // Don't throw for permission errors, just log
      if (error.code === 'EACCES' || error.code === 'EPERM') {
        console.error(`Permission denied saving chunk at ${chunk.cx},${chunk.cy}:`, error.message);
        throw new Error(`Save failed: permission denied for chunk ${chunk.cx},${chunk.cy}`);
      }
      
      throw error;
    }
  }
  
  /**
   * Load a chunk from filesystem
   */
  async load(seed, cx, cy) {
    // Validate coordinates
    this._validateCoordinates(cx, cy);
    // Try compressed first, then uncompressed
    const compressedPath = path.join(this.baseDir, seed, 'chunks', 
      `${cx < 0 ? 'n' + Math.abs(cx) : cx}_${cy < 0 ? 'n' + Math.abs(cy) : cy}.json.gz`);
    const uncompressedPath = path.join(this.baseDir, seed, 'chunks',
      `${cx < 0 ? 'n' + Math.abs(cx) : cx}_${cy < 0 ? 'n' + Math.abs(cy) : cy}.json`);
    
    let filePath;
    let isCompressed = false;
    
    // Check which file exists
    try {
      await fs.access(compressedPath);
      filePath = compressedPath;
      isCompressed = true;
    } catch {
      try {
        await fs.access(uncompressedPath);
        filePath = uncompressedPath;
      } catch {
        return null; // Chunk doesn't exist
      }
    }
    
    try {
      // Read file
      let data = await fs.readFile(filePath);
      this.stats.totalBytesRead += data.length;
      
      // Decompress if needed
      if (isCompressed) {
        data = await gunzip(data);
      }
      
      // Parse JSON
      const chunk = JSON.parse(data.toString());
      
      // Migrate if needed
      if (!chunk.metadata || chunk.metadata.version !== this.currentVersion) {
        // Create backup before migration
        if (this.createBackups) {
          const backupPath = this._getBackupPath(seed, cx, cy);
          await this._ensureDirectory(path.dirname(backupPath));
          await fs.copyFile(filePath, backupPath);
        }
        
        // Migrate chunk
        const migrated = this._migrateChunk(chunk);
        
        // Save migrated version
        await this.save(seed, migrated);
        
        this.stats.totalLoads++;
        return migrated;
      }
      
      this.stats.totalLoads++;
      return chunk;
      
    } catch (error) {
      this.stats.loadErrors++;
      
      // Return null for corrupted files
      if (error instanceof SyntaxError) {
        console.error(`Corrupted chunk file at ${cx},${cy}:`, error.message);
        return null;
      }
      
      throw error;
    }
  }
  
  /**
   * Delete a chunk from filesystem
   */
  async delete(seed, cx, cy) {
    const compressedPath = path.join(this.baseDir, seed, 'chunks',
      `${cx < 0 ? 'n' + Math.abs(cx) : cx}_${cy < 0 ? 'n' + Math.abs(cy) : cy}.json.gz`);
    const uncompressedPath = path.join(this.baseDir, seed, 'chunks',
      `${cx < 0 ? 'n' + Math.abs(cx) : cx}_${cy < 0 ? 'n' + Math.abs(cy) : cy}.json`);
    
    let deleted = false;
    
    try {
      await fs.unlink(compressedPath);
      deleted = true;
    } catch {
      // Try uncompressed
    }
    
    try {
      await fs.unlink(uncompressedPath);
      deleted = true;
    } catch {
      // File doesn't exist
    }
    
    if (deleted) {
      this.stats.totalDeletes++;
    }
    
    return deleted;
  }
  
  /**
   * Check if a chunk exists
   */
  async exists(seed, cx, cy) {
    const compressedPath = path.join(this.baseDir, seed, 'chunks',
      `${cx < 0 ? 'n' + Math.abs(cx) : cx}_${cy < 0 ? 'n' + Math.abs(cy) : cy}.json.gz`);
    const uncompressedPath = path.join(this.baseDir, seed, 'chunks',
      `${cx < 0 ? 'n' + Math.abs(cx) : cx}_${cy < 0 ? 'n' + Math.abs(cy) : cy}.json`);
    
    try {
      await fs.access(compressedPath);
      return true;
    } catch {
      try {
        await fs.access(uncompressedPath);
        return true;
      } catch {
        return false;
      }
    }
  }
  
  /**
   * Query chunks in a rectangular region
   */
  async queryRegion(seed, x1, y1, x2, y2) {
    const minX = Math.min(x1, x2);
    const maxX = Math.max(x1, x2);
    const minY = Math.min(y1, y2);
    const maxY = Math.max(y1, y2);
    
    const chunks = [];
    
    for (let cx = minX; cx <= maxX; cx++) {
      for (let cy = minY; cy <= maxY; cy++) {
        const chunk = await this.load(seed, cx, cy);
        if (chunk) {
          chunks.push(chunk);
        }
      }
    }
    
    return chunks;
  }
  
  /**
   * Query chunks by metadata
   */
  async queryByMetadata(seed, criteria) {
    const chunks = [];
    const chunkDir = path.join(this.baseDir, seed, 'chunks');
    
    try {
      const files = await fs.readdir(chunkDir);
      
      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.json.gz')) continue;
        
        const coords = this._parseFilename(file);
        if (!coords) continue;
        
        const chunk = await this.load(seed, coords.cx, coords.cy);
        if (!chunk) continue;
        
        // Check criteria
        let matches = true;
        for (const [key, value] of Object.entries(criteria)) {
          if (chunk[key] !== value && chunk.metadata?.[key] !== value) {
            matches = false;
            break;
          }
        }
        
        if (matches) {
          chunks.push(chunk);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist
      }
      throw error;
    }
    
    return chunks;
  }
  
  /**
   * List all saved chunks for a seed
   */
  async listChunks(seed) {
    const chunkDir = path.join(this.baseDir, seed, 'chunks');
    const coords = [];
    
    try {
      const files = await fs.readdir(chunkDir);
      
      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.json.gz')) continue;
        
        const parsed = this._parseFilename(file);
        if (parsed) {
          coords.push(parsed);
        }
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return []; // Directory doesn't exist
      }
      throw error;
    }
    
    return coords;
  }
  
  /**
   * Get persistence statistics
   */
  getStats() {
    return { ...this.stats };
  }
  
  /**
   * Get storage usage for a world
   */
  async getStorageUsage(seed) {
    const chunkDir = path.join(this.baseDir, seed, 'chunks');
    let totalBytes = 0;
    let chunkCount = 0;
    
    try {
      const files = await fs.readdir(chunkDir);
      
      for (const file of files) {
        if (!file.endsWith('.json') && !file.endsWith('.json.gz')) continue;
        
        const filePath = path.join(chunkDir, file);
        const stats = await fs.stat(filePath);
        
        totalBytes += stats.size;
        chunkCount++;
      }
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          chunkCount: 0,
          totalBytes: 0,
          averageChunkSize: 0
        };
      }
      throw error;
    }
    
    return {
      chunkCount,
      totalBytes,
      averageChunkSize: chunkCount > 0 ? Math.round(totalBytes / chunkCount) : 0
    };
  }
  
  /**
   * Clear all data for a world
   */
  async clearWorld(seed) {
    const worldDir = path.join(this.baseDir, seed);
    
    try {
      await fs.rm(worldDir, { recursive: true, force: true });
      return true;
    } catch (error) {
      if (error.code === 'ENOENT') {
        return false; // Already doesn't exist
      }
      throw error;
    }
  }
}