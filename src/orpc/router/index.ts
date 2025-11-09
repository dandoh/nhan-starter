import { addTodo, listTodos } from './todos'
import { 
  createConversation, 
  getConversation, 
  findOrCreateConversationForContext,
  getConversationsForContext 
} from './conversations'
import * as aiTables from './ai-tables'
import * as connectors from './connectors'
import * as workbooks from './workbooks'

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
    update: aiTables.updateTable,
    delete: aiTables.deleteTable,
    
    // Column operations
    getColumns: aiTables.getColumns,
    createColumn: aiTables.createColumn,
    updateColumn: aiTables.updateColumn,
    deleteColumn: aiTables.deleteColumn,
    
    // Record operations
    getRecords: aiTables.getRecords,
    createRecord: aiTables.createRecord,
    // addRowsWithValues: aiTables.addRowsWithValues,
    deleteRecord: aiTables.deleteRecord,
    
    // Cell operations
    getCells: aiTables.getCells,
    updateCell: aiTables.updateCell,
    getUpdates: aiTables.getTableUpdates,
    
    // AI computation
    triggerComputeAllCells: aiTables.triggerComputeAllCells,
  },
  
  // Connectors
  connectors: {
    initiateConnection: connectors.initiateConnection,
    listConnections: connectors.listConnections,
  },
  
  // Workbooks
  workbooks: {
    list: workbooks.listWorkbooks,
    create: workbooks.createWorkbook,
    get: workbooks.getWorkbook,
    update: workbooks.updateWorkbook,
    delete: workbooks.deleteWorkbook,
    
    // Block operations
    getBlocks: workbooks.getBlocks,
    createBlock: workbooks.createBlock,
    updateBlock: workbooks.updateBlock,
    deleteBlock: workbooks.deleteBlock,
  },
}
