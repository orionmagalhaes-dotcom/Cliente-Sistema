
import { createClient } from '@supabase/supabase-js';
import { User, ClientDBRow, Dorama, AdminUserDBRow } from '../types';
import { MOCK_DB_CLIENTS } from '../constants';

// --- CONFIGURAÇÃO DO SUPABASE ---
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://srsqipevsammsfzyaewn.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNyc3FpcGV2c2FtbXNmenlhZXduIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUwMTA0NTQsImV4cCI6MjA4MDU4NjQ1NH0.8ePfpnSVeluDG-YwvrjWiIhl6fr5p6UDoZKjF7rrL1I';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Helper para garantir chaves consistentes no DB (apenas números)
const cleanPhone = (phone: string) => {
    if (!phone) return '';
    return phone.replace(/\D/g, '');
};

// --- GERENCIAMENTO DE DADOS LOCAIS ---
const getLocalUserData = (phoneNumber: string) => {
  try {
    const clean = cleanPhone(phoneNumber);
    const data = localStorage.getItem(`dorama_user_${clean}`);
    return data ? JSON.parse(data) : { watching: [], favorites: [], completed: [] };
  } catch (e) {
    return { watching: [], favorites: [], completed: [] };
  }
};

export const addLocalDorama = (phoneNumber: string, type: 'watching' | 'favorites' | 'completed', dorama: Dorama) => {
  const clean = cleanPhone(phoneNumber);
  const currentData = getLocalUserData(clean);
  
  if (!currentData[type]) {
    currentData[type] = [];
  }

  // Filter duplicates locally
  currentData[type] = currentData[type].filter((d: Dorama) => d.title !== dorama.title && d.id !== dorama.id);

  currentData[type].push(dorama);
  localStorage.setItem(`dorama_user_${clean}`, JSON.stringify(currentData));
  return currentData;
};

// --- FUNÇÕES DE CLIENTE ---

export const getAllClients = async (): Promise<ClientDBRow[]> => {
  try {
    if (supabase) {
      const { data, error } = await supabase.from('clients').select('*');
      if (!error && data) return data as unknown as ClientDBRow[];
    }
    return MOCK_DB_CLIENTS;
  } catch (e) {
    return MOCK_DB_CLIENTS;
  }
};

export const getTestUser = async (): Promise<{ user: User | null, error: string | null }> => {
    try {
        const { data, error } = await supabase
            .from('clients')
            .select('*')
            .eq('phone_number', '00000000000');
        
        if (!data || data.length === 0) return { user: null, error: 'Usuário de teste não configurado.' };
        
        const result = processUserLogin(data as unknown as ClientDBRow[]);

        if (result.user) {
            const doramas = await getUserDoramasFromDB(result.user.phoneNumber);
            result.user.watching = doramas.watching;
            result.user.favorites = doramas.favorites;
            result.user.completed = doramas.completed;
        }

        return result;
    } catch (e) {
        return { user: null, error: 'Erro de conexão.' };
    }
};

export const createDemoClient = async (): Promise<boolean> => {
    try {
        const fakeId = Math.floor(1000 + Math.random() * 9000);
        const demoPhone = `99999${fakeId}`; 
        
        const demoUser: Partial<ClientDBRow> = {
            phone_number: demoPhone,
            client_name: `Demo User (${fakeId})`,
            client_password: '1234',
            subscriptions: ['Viki Pass', 'Kocowa+', 'IQIYI', 'WeTV', 'DramaBox'],
            purchase_date: new Date().toISOString(),
            duration_months: 999,
            is_debtor: false,
            deleted: false,
            override_expiration: true,
            game_progress: {}
        };

        const { error } = await supabase.from('clients').insert([demoUser]);
        return !error;
    } catch (e) {
        return false;
    }
};

export const checkUserStatus = async (lastFourDigits: string): Promise<{ 
  exists: boolean; 
  hasPassword: boolean; 
  phoneMatches: string[] 
}> => {
  try {
    if (!supabase) return { exists: false, hasPassword: false, phoneMatches: [] };

    const { data, error } = await supabase
      .from('clients')
      .select('phone_number, client_password, deleted')
      .like('phone_number', `%${lastFourDigits}`);

    if (error || !data || data.length === 0) {
      const foundMock = MOCK_DB_CLIENTS.filter(c => c.phone_number.endsWith(lastFourDigits));
      if (foundMock.length > 0) {
         if (foundMock[0].deleted) return { exists: false, hasPassword: false, phoneMatches: [] };
         return { exists: true, hasPassword: false, phoneMatches: [foundMock[0].phone_number] };
      }
      return { exists: false, hasPassword: false, phoneMatches: [] };
    }

    const activeClients = (data as any[]).filter(c => !c.deleted);
    if (activeClients.length === 0) return { exists: false, hasPassword: false, phoneMatches: [] };

    const hasPass = activeClients.some(row => row.client_password && row.client_password.trim() !== '');
    const phones = Array.from(new Set(activeClients.map(d => d.phone_number as string)));

    return { exists: true, hasPassword: hasPass, phoneMatches: phones };

  } catch (e) {
    return { exists: false, hasPassword: false, phoneMatches: [] };
  }
};

export const registerClientPassword = async (phoneNumber: string, password: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .update({ client_password: password })
      .eq('phone_number', phoneNumber)
      .select();

    return !error && data && data.length > 0;
  } catch (e) {
    return false;
  }
};

export const loginWithPassword = async (phoneNumber: string, password: string): Promise<{ user: User | null, error: string | null }> => {
  try {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('phone_number', phoneNumber);

    if (error || !data || data.length === 0) {
      return { user: null, error: 'Usuário não encontrado.' };
    }

    const clientData = data[0] as unknown as ClientDBRow;
    if (clientData.deleted) {
      return { user: null, error: 'Acesso revogado.' };
    }

    if (String(clientData.client_password).trim() !== String(password).trim()) {
      return { user: null, error: 'Senha incorreta.' };
    }

    const result = processUserLogin(data as unknown as ClientDBRow[]);

    if (result.user) {
        // Fetch doramas immediately to ensure freshness
        const doramas = await getUserDoramasFromDB(result.user.phoneNumber);
        result.user.watching = doramas.watching;
        result.user.favorites = doramas.favorites;
        result.user.completed = doramas.completed;
    }

    return result;

  } catch (e) {
    return { user: null, error: 'Erro de conexão.' };
  }
};

export const processUserLogin = (userRows: ClientDBRow[]): { user: User | null, error: string | null } => {
    if (userRows.length === 0) return { user: null, error: 'Dados vazios.' };

    const primaryPhone = userRows[0].phone_number;
    const allServices = new Set<string>();
    let bestRow = userRows[0];
    let maxExpiryTime = 0;
    let isDebtorAny = false;
    let overrideAny = false;
    let clientName = "Dorameira";

    const hasActiveAccount = userRows.some(row => !row.deleted);
    if (!hasActiveAccount) return { user: null, error: 'Conta desativada.' };

    userRows.forEach(row => {
      if (row.deleted) return;
      if (row.client_name) clientName = row.client_name;

      let subs: string[] = [];
      if (Array.isArray(row.subscriptions)) {
        subs = row.subscriptions;
      } else if (typeof row.subscriptions === 'string') {
        const s = row.subscriptions as string;
        subs = s.includes('+') ? s.split('+').map(i => i.trim().replace(/^"|"$/g, '')) : [s.replace(/^"|"$/g, '')];
      }
      subs.forEach(s => s && allServices.add(s));
      if (row.is_debtor) isDebtorAny = true;
      if (row.override_expiration) overrideAny = true;

      const purchase = new Date(row.purchase_date);
      const expiry = new Date(purchase);
      expiry.setMonth(purchase.getMonth() + row.duration_months);

      if (expiry.getTime() > maxExpiryTime) {
        maxExpiryTime = expiry.getTime();
        bestRow = row;
      }
    });

    // Initial load from local, will be overwritten by DB fetch in loginWithPassword
    const localData = getLocalUserData(primaryPhone);
    const gameProgress = bestRow.game_progress || {};

    const appUser: User = {
      id: bestRow.id,
      name: clientName, 
      phoneNumber: bestRow.phone_number,
      purchaseDate: bestRow.purchase_date, 
      durationMonths: bestRow.duration_months,
      services: Array.from(allServices),
      isDebtor: isDebtorAny,
      overrideExpiration: overrideAny,
      watching: localData.watching || [],
      favorites: localData.favorites || [],
      completed: localData.completed || [],
      gameProgress: gameProgress
    };

    return { user: appUser, error: null };
};

export const loginUserByPhone = async (lastFourDigits: string): Promise<{ user: User | null, error: string | null }> => {
  const found = MOCK_DB_CLIENTS.filter(c => c.phone_number.endsWith(lastFourDigits) && !c.deleted);
  if (found.length > 0) return processUserLogin(found);
  return { user: null, error: 'Cliente não encontrado.' };
};

// --- GAME OPERATIONS ---

export const saveGameProgress = async (phoneNumber: string, gameId: string, data: any): Promise<boolean> => {
    try {
        const { data: clientData } = await supabase
            .from('clients')
            .select('game_progress')
            .eq('phone_number', phoneNumber)
            .single();
        
        let currentProgress = clientData?.game_progress || {};
        currentProgress[gameId] = { ...currentProgress[gameId], ...data };

        const { error } = await supabase
            .from('clients')
            .update({ game_progress: currentProgress })
            .eq('phone_number', phoneNumber);
            
        return !error;
    } catch (e) {
        return false;
    }
};

// --- DORAMA OPERATIONS (ROBUST) ---

export const getUserDoramasFromDB = async (phoneNumber: string): Promise<{ watching: Dorama[], favorites: Dorama[], completed: Dorama[] }> => {
    const cleanNum = cleanPhone(phoneNumber);
    
    // Fallback: Local data using strict cleaned number
    const localData = getLocalUserData(cleanNum);
    const result = { watching: [], favorites: [], completed: [] };
    
    // Strategy: Search for multiple variations of the phone number to handle formatting inconsistencies
    const possibleNumbers = [cleanNum];
    if (cleanNum.startsWith('55') && cleanNum.length > 10) {
        possibleNumbers.push(cleanNum.substring(2)); // Try without 55
    } else if (cleanNum.length <= 11) {
        possibleNumbers.push(`55${cleanNum}`); // Try with 55
    }

    try {
      let { data, error } = await supabase
        .from('user_doramas')
        .select('*')
        .in('phone_number', possibleNumbers); // Use IN operator to find any match
      
      if (data && !error && data.length > 0) {
          const dbItems: Dorama[] = data.map((row: any) => ({
              id: row.id,
              title: row.title,
              genre: row.genre,
              thumbnail: row.thumbnail,
              status: row.status === 'watching' ? 'Watching' : (row.status === 'completed' ? 'Completed' : 'Plan to Watch'),
              episodesWatched: row.episodes_watched,
              totalEpisodes: row.total_episodes,
              season: row.season,
              rating: row.rating
          }));

          result.watching = dbItems.filter(d => d.status === 'Watching');
          result.favorites = dbItems.filter(d => d.status === 'Plan to Watch');
          result.completed = dbItems.filter(d => d.status === 'Completed');
          
          // Sync DB data to LocalStorage to keep it fresh
          localStorage.setItem(`dorama_user_${cleanNum}`, JSON.stringify(result));
          
          return result;
      }
      
      // If DB returns empty, return local data (offline support)
      return localData;

    } catch (e) {
      console.error("DB Fetch Error, falling back to local", e);
      return localData;
    }
};

export const addDoramaToDB = async (phoneNumber: string, listType: 'watching' | 'favorites' | 'completed', dorama: Dorama): Promise<Dorama | null> => {
    const cleanNum = cleanPhone(phoneNumber);
    
    // Always save to local first (Optimistic UI)
    addLocalDorama(cleanNum, listType, dorama);

    try {
      let statusStr = 'Watching';
      if (listType === 'favorites') statusStr = 'Plan to Watch';
      if (listType === 'completed') statusStr = 'Completed';

      const dbRow = {
        phone_number: cleanNum, // Saves with the strictest cleaned number
        title: dorama.title,
        genre: dorama.genre || 'Dorama',
        thumbnail: dorama.thumbnail,
        status: statusStr, 
        episodes_watched: dorama.episodesWatched || 0,
        total_episodes: dorama.totalEpisodes || 16,
        season: dorama.season || 1,
        rating: dorama.rating || 0,
        list_type: listType
      };
  
      const { data, error } = await supabase
        .from('user_doramas')
        .insert([dbRow])
        .select()
        .single();
  
      if (error || !data) {
          console.warn("Supabase Insert Failed:", error);
          // Return an object with a local ID so UI doesn't break
          return { ...dorama, id: 'local-' + Date.now(), status: statusStr as any };
      }
  
      const realDorama = { ...dorama, id: data.id, status: statusStr as any };
      
      // Re-save local with the Real ID from DB to ensure sync
      addLocalDorama(cleanNum, listType, realDorama); 

      return realDorama;
    } catch (e) {
      console.error("Add Dorama Exception:", e);
      return { ...dorama, id: 'local-' + Date.now() };
    }
};
  
export const updateDoramaInDB = async (dorama: Dorama): Promise<boolean> => {
    try {
      if (dorama.id.startsWith('temp-') || dorama.id.startsWith('local-')) return true;
      const { error } = await supabase
        .from('user_doramas')
        .update({
          episodes_watched: dorama.episodesWatched,
          rating: dorama.rating,
          status: dorama.status, 
          season: dorama.season,
          total_episodes: dorama.totalEpisodes
        })
        .eq('id', dorama.id);
      return !error;
    } catch (e) { return false; }
};
  
export const removeDoramaFromDB = async (doramaId: string): Promise<boolean> => {
    try {
      if (doramaId.startsWith('temp-') || doramaId.startsWith('local-')) return true;
      const { error } = await supabase.from('user_doramas').delete().eq('id', doramaId);
      return !error;
    } catch (e) { return false; }
};

// --- ADMIN ---
export const verifyAdminLogin = async (login: string, pass: string): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .from('admin_users')
      .select('*')
      .eq('username', login)
      .limit(1);

    if (error || !data || data.length === 0) return false;
    return (data[0] as AdminUserDBRow).password === pass;
  } catch (e) { return false; }
};

export const saveClientToDB = async (client: Partial<ClientDBRow>): Promise<boolean> => {
    try {
      const payload: any = { ...client };
      delete payload.created_at; 
      if (client.id) {
         const { error } = await supabase.from('clients').update(payload).eq('id', client.id);
         return !error;
      } else {
         const { error } = await supabase.from('clients').insert([payload]);
         return !error;
      }
    } catch (e) { return false; }
};
  
export const deleteClientFromDB = async (id: string): Promise<boolean> => {
      try {
          const { error } = await supabase.from('clients').update({ deleted: true }).eq('id', id);
          return !error;
      } catch (e) { return false; }
};
  
export const resetAllClientPasswords = async (): Promise<boolean> => {
      try {
          const { error } = await supabase.from('clients').update({ client_password: '' }).neq('id', '0000'); 
          return !error;
      } catch (e) { return false; }
};
  
export const updateClientName = async (phoneNumber: string, name: string): Promise<boolean> => {
      try {
          const { error } = await supabase.from('clients').update({ client_name: name }).eq('phone_number', phoneNumber);
          return !error;
      } catch (e) { return false; }
};

// --- SYSTEM SETTINGS ---
export interface SystemConfig {
    bannerText: string;
    bannerType: 'info' | 'warning' | 'error' | 'success';
    bannerActive: boolean;
    serviceStatus: { [key: string]: 'ok' | 'issues' | 'down' };
}

export const getSystemConfig = async (): Promise<SystemConfig> => {
    const defaultConfig: SystemConfig = { 
        bannerText: '', bannerType: 'info', bannerActive: false, 
        serviceStatus: { 'Viki Pass': 'ok', 'Kocowa+': 'ok', 'IQIYI': 'ok', 'WeTV': 'ok' } 
    };

    try {
        const { data } = await supabase.from('app_credentials').select('email').eq('service', 'SYSTEM_CONFIG').single();
        if (data && data.email) {
            return JSON.parse(data.email);
        }
    } catch(e) {}
    return defaultConfig;
};

export const saveSystemConfig = async (config: SystemConfig): Promise<boolean> => {
    try {
        const payload = {
            service: 'SYSTEM_CONFIG',
            email: JSON.stringify(config),
            password: 'CONFIG_IGNORED',
            is_visible: false,
            published_at: new Date().toISOString()
        };

        const { data } = await supabase.from('app_credentials').select('id').eq('service', 'SYSTEM_CONFIG').single();
        
        if (data) {
             const { error } = await supabase.from('app_credentials').update(payload).eq('id', data.id);
             return !error;
        } else {
             const { error } = await supabase.from('app_credentials').insert([payload]);
             return !error;
        }
    } catch (e) { return false; }
};
