import { addTodo, listTodos } from './todos'
import { 
  createConversation, 
  getConversation, 
  findOrCreateConversationForContext,
  getConversationsForContext 
} from './conversations'
import * as aiTables from './ai-tables'
import * as workbooksRouter from './workbooks'

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
  
  // Workbooks
  workbooks: {
    list: workbooksRouter.listWorkbooks,
    create: workbooksRouter.createWorkbook,
    get: workbooksRouter.getWorkbook,
    update: workbooksRouter.updateWorkbook,
    delete: workbooksRouter.deleteWorkbook,
    
    // Block operations
    getBlocks: workbooksRouter.getBlocks,
    createBlock: workbooksRouter.createBlock,
    deleteBlock: workbooksRouter.deleteBlock,
    
    // Markdown operations
    getMarkdown: workbooksRouter.getMarkdown,
    getMarkdowns: workbooksRouter.getMarkdowns,
    updateMarkdown: workbooksRouter.updateMarkdown,
  },
  
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
