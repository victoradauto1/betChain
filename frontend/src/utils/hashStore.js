import fs from 'fs';
import path from 'path';

const STORE_FILE = path.join(process.cwd(), 'data', 'ipfs-hashes.json');

/**
 * Garante que o diretório de armazenamento existe
 */
function ensureDir() {
  const dir = path.dirname(STORE_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 [HashStore] Created directory: ${dir}`);
  }
}

/**
 * Salva o hash IPFS associado a um betId
 */
export function saveHash(betId, ipfsHash) {
  try {
    ensureDir();
    
    let store = {};
    
    // Ler arquivo existente se houver
    if (fs.existsSync(STORE_FILE)) {
      const data = fs.readFileSync(STORE_FILE, 'utf-8');
      store = JSON.parse(data);
    }
    
    // Adicionar novo hash
    store[betId.toString()] = {
      ipfsHash,
      savedAt: new Date().toISOString(),
    };
    
    // Salvar de volta
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    
    console.log(`✅ [HashStore] Saved betId=${betId} -> ${ipfsHash}`);
    return true;
  } catch (err) {
    console.error('❌ [HashStore] Error saving:', err);
    return false;
  }
}

/**
 * Recupera o hash IPFS de um betId
 */
export function getHash(betId) {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      console.log('⚠️ [HashStore] Store file does not exist yet');
      return null;
    }
    
    const data = fs.readFileSync(STORE_FILE, 'utf-8');
    const store = JSON.parse(data);
    
    const entry = store[betId.toString()];
    
    if (entry) {
      console.log(`✅ [HashStore] Found betId=${betId} -> ${entry.ipfsHash}`);
      return entry.ipfsHash;
    }
    
    console.log(`⚠️ [HashStore] No hash found for betId=${betId}`);
    return null;
  } catch (err) {
    console.error('❌ [HashStore] Error reading:', err);
    return null;
  }
}

/**
 * Recupera todos os hashes (útil para debug)
 */
export function getAllHashes() {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return {};
    }
    
    const data = fs.readFileSync(STORE_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error('❌ [HashStore] Error reading all:', err);
    return {};
  }
}

/**
 * Deleta um hash (útil para testing)
 */
export function deleteHash(betId) {
  try {
    if (!fs.existsSync(STORE_FILE)) {
      return false;
    }
    
    const data = fs.readFileSync(STORE_FILE, 'utf-8');
    const store = JSON.parse(data);
    
    delete store[betId.toString()];
    
    fs.writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
    
    console.log(`🗑️ [HashStore] Deleted betId=${betId}`);
    return true;
  } catch (err) {
    console.error('❌ [HashStore] Error deleting:', err);
    return false;
  }
}

/**
 * Limpa todo o armazenamento (útil para testing)
 */
export function clearAll() {
  try {
    if (fs.existsSync(STORE_FILE)) {
      fs.unlinkSync(STORE_FILE);
      console.log('🗑️ [HashStore] Cleared all hashes');
      return true;
    }
    return false;
  } catch (err) {
    console.error('❌ [HashStore] Error clearing:', err);
    return false;
  }
}