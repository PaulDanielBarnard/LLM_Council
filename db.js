'use strict';

const { Pool } = require('pg');

// Database configuration from environment variables
const config = {
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'council_db',
  max: parseInt(process.env.DB_POOL_MAX || '20'),
  idleTimeoutMillis: parseInt(process.env.DB_IDLE_TIMEOUT || '30000'),
  connectionTimeoutMillis: parseInt(process.env.DB_CONN_TIMEOUT || '2000'),
};

let pool;

function initialize() {
  try {
    pool = new Pool(config);
    console.log(`✅ Database pool initialized: ${config.host}:${config.port}/${config.database}`);
    return pool;
  } catch (error) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

async function query(sql, params = []) {
  try {
    const result = await pool.query(sql, params);
    return result.rows;
  } catch (error) {
    console.error('Query error:', error.message);
    throw error;
  }
}

async function createConversation(user_query, mode = 'local') {
  try {
    const title = user_query.length > 100 ? user_query.substring(0, 100) + '...' : user_query;

    const sql = `INSERT INTO conversations (title, user_query, mode, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW())
                 RETURNING id, created_at`;

    const result = await query(sql, [title, user_query, mode]);

    return {
      id: result[0].id,
      created_at: result[0].created_at
    };
  } catch (error) {
    console.error('Create conversation error:', error.message);
    throw error;
  }
}

async function saveMessage(conversation_id, role, member_name, model_id, content) {
  try {
    const sql = `INSERT INTO messages (conversation_id, role, member_name, model_id, content, timestamp)
                 VALUES ($1, $2, $3, $4, $5, NOW())
                 RETURNING id`;

    const result = await query(sql, [conversation_id, role, member_name, model_id, content]);

    return result[0].id;
  } catch (error) {
    console.error('Save message error:', error.message);
    throw error;
  }
}

async function loadConversation(conversation_id) {
  try {
    // Fetch conversation metadata
    const conv_sql = 'SELECT * FROM conversations WHERE id = $1';
    const conv_result = await query(conv_sql, [conversation_id]);

    if (conv_result.length === 0) {
      return null;
    }

    const conversation = conv_result[0];

    // Fetch all messages for this conversation
    const msg_sql = 'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY timestamp ASC';
    const messages = await query(msg_sql, [conversation_id]);

    // Fetch search results if any
    const search_sql = 'SELECT * FROM search_results WHERE conversation_id = $1 ORDER BY timestamp ASC';
    const search_results = await query(search_sql, [conversation_id]);

    return {
      id: conversation.id,
      title: conversation.title,
      user_query: conversation.user_query,
      mode: conversation.mode,
      created_at: conversation.created_at,
      updated_at: conversation.updated_at,
      messages: messages,
      search_results: search_results
    };
  } catch (error) {
    console.error('Load conversation error:', error.message);
    return null;
  }
}

async function listConversations(limit = 100) {
  try {
    const sql = 'SELECT id, title, created_at, updated_at FROM conversations ORDER BY updated_at DESC LIMIT $1';
    const result = await query(sql, [limit]);
    return result;
  } catch (error) {
    console.error('List conversations error:', error.message);
    return [];
  }
}

async function deleteConversation(conversation_id) {
  try {
    // Delete messages first (foreign key)
    await query('DELETE FROM messages WHERE conversation_id = $1', [conversation_id]);

    // Delete search results
    await query('DELETE FROM search_results WHERE conversation_id = $1', [conversation_id]);

    // Delete conversation
    await query('DELETE FROM conversations WHERE id = $1', [conversation_id]);

    return { success: true };
  } catch (error) {
    console.error('Delete conversation error:', error.message);
    return { success: false, error: error.message };
  }
}

async function saveSearchResults(conversation_id, query_text, results_json) {
  try {
    const sql = `INSERT INTO search_results (conversation_id, query, results, source, timestamp)
                 VALUES ($1, $2, $3, 'duckduckgo', NOW())
                 RETURNING id`;

    const result = await query(sql, [conversation_id, query_text, JSON.stringify(results_json)]);

    return result[0].id;
  } catch (error) {
    console.error('Save search results error:', error.message);
    return -1;
  }
}

async function updateConversationTimestamp(conversation_id) {
  try {
    const sql = 'UPDATE conversations SET updated_at = NOW() WHERE id = $1';
    await query(sql, [conversation_id]);
    return true;
  } catch (error) {
    console.error('Update timestamp error:', error.message);
    return false;
  }
}

module.exports = {
  initialize,
  query,
  createConversation,
  saveMessage,
  loadConversation,
  listConversations,
  deleteConversation,
  saveSearchResults,
  updateConversationTimestamp
};