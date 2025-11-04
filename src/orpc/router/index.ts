import { addTodo, listTodos } from './todos'
import { 
  createConversation, 
  getConversation, 
  findOrCreateConversationForContext,
  getConversationsForContext 
} from './conversations'
import * as aiTables from './ai-tables'

export default {
  listTodos,
  addTodo,
  
  // Conversations
  conversations: {
    create: createConversation,
    get: getConversation,
    findOrCreateForContext: findOrCreateConversationForContext,
    getForContext: getConversationsForContext,
  },
  
  // Deprecated - kept for backward compatibility
  createConversation,
  getConversation,
  
  // AI Tables
  aiTables: {
    // Table management
    list: aiTables.listTables,
    create: aiTables.createTable,
    get: aiTables.getTable,
    delete: aiTables.deleteTable,
    
    // Column operations
    getColumns: aiTables.getColumns,
    createColumn: aiTables.createColumn,
    updateColumn: aiTables.updateColumn,
    deleteColumn: aiTables.deleteColumn,
    
    // Record operations
    getRecords: aiTables.getRecords,
    createRecord: aiTables.createRecord,
    deleteRecord: aiTables.deleteRecord,
    
    // Cell operations
    getCells: aiTables.getCells,
    updateCell: aiTables.updateCell,
    getUpdates: aiTables.getTableUpdates,
    
    // AI computation
    triggerComputeAllCells: aiTables.triggerComputeAllCells,
  },
}
