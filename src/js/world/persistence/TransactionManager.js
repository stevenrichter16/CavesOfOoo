/**
 * Transaction Manager for atomic multi-step operations
 * 
 * Provides ACID-compliant transaction support for complex operations
 * that need to be executed atomically with rollback capabilities.
 * 
 * @example
 * const txId = transactionManager.beginTransaction('chunk_save');
 * transactionManager.addOperation(txId, 
 *   async () => await saveChunk(chunk),
 *   async () => await deleteChunk(chunk)
 * );
 * const result = await transactionManager.commitTransaction(txId);
 */

export class TransactionManager {
  constructor() {
    this.activeTransactions = new Map();
    this.transactionIdCounter = 0;
  }
  
  /**
   * Begin a new transaction
   * @param {string} name - Name of the transaction for debugging
   * @returns {string} Transaction ID
   */
  beginTransaction(name = 'unnamed') {
    const transactionId = `tx_${++this.transactionIdCounter}_${name}`;
    const transaction = {
      id: transactionId,
      name,
      operations: [],
      rollbackHandlers: [],
      startTime: Date.now(),
      status: 'active'
    };
    
    this.activeTransactions.set(transactionId, transaction);
    return transactionId;
  }
  
  /**
   * Add an operation to a transaction
   * @param {string} transactionId - Transaction ID
   * @param {Function} operation - Async operation to execute
   * @param {Function} [rollbackHandler] - Optional rollback handler
   * @throws {Error} If transaction not found or not active
   */
  addOperation(transactionId, operation, rollbackHandler) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is not active`);
    }
    
    transaction.operations.push(operation);
    if (rollbackHandler) {
      transaction.rollbackHandlers.push(rollbackHandler);
    }
  }
  
  /**
   * Commit a transaction
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Result with success, results, and duration
   * @throws {Error} If transaction not found or not active
   */
  async commitTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }
    
    if (transaction.status !== 'active') {
      throw new Error(`Transaction ${transactionId} is not active`);
    }
    
    transaction.status = 'committing';
    
    try {
      // Execute all operations
      const results = [];
      for (let i = 0; i < transaction.operations.length; i++) {
        try {
          const result = await transaction.operations[i]();
          results.push(result);
        } catch (error) {
          // Operation failed, rollback
          console.error(`Transaction ${transactionId} operation ${i} failed:`, error);
          await this.rollbackTransaction(transactionId, i - 1);
          throw error;
        }
      }
      
      transaction.status = 'committed';
      transaction.endTime = Date.now();
      transaction.duration = transaction.endTime - transaction.startTime;
      
      // Clean up after successful commit
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 5000); // Keep for 5 seconds for debugging
      
      return {
        success: true,
        transactionId,
        results,
        duration: transaction.duration
      };
      
    } catch (error) {
      transaction.status = 'rolled_back';
      transaction.error = error;
      
      // Clean up after rollback
      setTimeout(() => {
        this.activeTransactions.delete(transactionId);
      }, 5000);
      
      return {
        success: false,
        transactionId,
        error: error.message
      };
    }
  }
  
  /**
   * Rollback a transaction
   * @param {string} transactionId - Transaction ID
   * @param {number} [upToIndex=-1] - Rollback up to this operation index
   */
  async rollbackTransaction(transactionId, upToIndex = -1) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      return;
    }
    
    transaction.status = 'rolling_back';
    
    // Determine how many operations to rollback
    const rollbackCount = upToIndex >= 0 ? upToIndex + 1 : transaction.rollbackHandlers.length;
    
    // Execute rollback handlers in reverse order
    for (let i = rollbackCount - 1; i >= 0; i--) {
      try {
        if (transaction.rollbackHandlers[i]) {
          await transaction.rollbackHandlers[i]();
        }
      } catch (rollbackError) {
        console.error(`Failed to rollback operation ${i}:`, rollbackError);
        // Continue with other rollbacks
      }
    }
    
    transaction.status = 'rolled_back';
  }
  
  /**
   * Abort a transaction
   */
  async abortTransaction(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    if (!transaction) {
      return false;
    }
    
    if (transaction.status === 'committed') {
      return false; // Can't abort committed transaction
    }
    
    await this.rollbackTransaction(transactionId);
    this.activeTransactions.delete(transactionId);
    return true;
  }
  
  /**
   * Get transaction status
   */
  getTransactionStatus(transactionId) {
    const transaction = this.activeTransactions.get(transactionId);
    return transaction ? transaction.status : null;
  }
  
  /**
   * Execute a function within a transaction
   * @param {string} name - Transaction name
   * @param {Array<{operation: Function, rollback: Function}>} operations - Operations with rollback handlers
   * @returns {Promise<Object>} Transaction result
   * @throws {Error} If any operation fails
   */
  async executeInTransaction(name, operations) {
    const txId = this.beginTransaction(name);
    
    try {
      const results = [];
      for (const { operation, rollback } of operations) {
        this.addOperation(txId, operation, rollback);
      }
      
      const result = await this.commitTransaction(txId);
      if (!result.success) {
        throw new Error(result.error);
      }
      
      return result;
      
    } catch (error) {
      await this.abortTransaction(txId);
      throw error;
    }
  }
  
  /**
   * Get active transaction count
   */
  getActiveTransactionCount() {
    return Array.from(this.activeTransactions.values())
      .filter(tx => tx.status === 'active' || tx.status === 'committing')
      .length;
  }
  
  /**
   * Clean up old transactions
   */
  cleanup() {
    const now = Date.now();
    const maxAge = 60000; // 1 minute
    
    for (const [id, transaction] of this.activeTransactions.entries()) {
      if (transaction.status === 'committed' || transaction.status === 'rolled_back') {
        if (now - transaction.startTime > maxAge) {
          this.activeTransactions.delete(id);
        }
      }
    }
  }
}