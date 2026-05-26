import { fetchBackendAPI } from './api';

const STORAGE_KEY = 'naino_progress_data';

const getLocalData = () => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      // Initialize registration date if missing
      if (!parsed.registrationDate) {
        parsed.registrationDate = getTodayDateString();
        saveLocalData(parsed);
      }
      return parsed;
    }
  } catch (e) {
    console.error("Error reading progress data", e);
  }
  
  const initialData = {
    streak: 0,
    lastStudyDate: null,
    totalSeconds: 0,
    lastCloudSync: null,
    registrationDate: getTodayDateString(),
    dailyRecords: {} // { 'YYYY-MM-DD': { seconds: 0, lectures: [] } }
  };
  saveLocalData(initialData);
  return initialData;
};

const saveLocalData = (data) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error("Error saving progress data", e);
  }
};

const getTodayDateString = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().split('T')[0];
};

export const getDayData = async (dateStr) => {
  const data = getLocalData();
  
  // If we have it locally, return it instantly
  if (data.dailyRecords[dateStr]) {
    return data.dailyRecords[dateStr];
  }

  // 200 IQ User Optimization: Never fetch dates before they installed/registered!
  if (data.registrationDate && dateStr < data.registrationDate) {
    return { seconds: 0, lectures: [] };
  }

  // If not local, and user is premium, try to fetch from cloud (Demand par supply)
  const isPremium = localStorage.getItem('naino_premium_member') === 'true';
  const token = localStorage.getItem('naino_access_token');
  
  if (isPremium && token && token !== 'XXXXXX') {
    try {
      const uuid = localStorage.getItem('naino_device_uuid');
      const response = await fetchBackendAPI('/api/keys/subcollection', 'POST', {
        code: token,
        deviceId: uuid,
        subcollection: 'daily_records',
        docId: dateStr,
        action: 'get'
      });
      
      if (response.exists) {
        const cloudData = response.data;
        // Save to local so we don't fetch it again
        data.dailyRecords[dateStr] = cloudData;
        saveLocalData(data);
        return cloudData;
      } else {
        // Mark it locally as empty so we don't fetch from Cloud again!
        data.dailyRecords[dateStr] = { seconds: 0, lectures: [] };
        saveLocalData(data);
      }
    } catch (e) {
      console.error("Error fetching day data from cloud", e);
    }
  }

  return { seconds: 0, lectures: [] };
};

export const logStudySession = async (course, title, seconds, link, extraData = {}) => {
  if (seconds <= 0) return;
  
  const data = getLocalData();
  const todayStr = getTodayDateString();

  // Proactively fill gap days (User's brilliant idea!)
  if (data.lastStudyDate && data.lastStudyDate !== todayStr && data.lastStudyDate < todayStr) {
    let loopDate = new Date(data.lastStudyDate);
    loopDate.setDate(loopDate.getDate() + 1);
    
    const endDate = new Date(todayStr);
    while (loopDate < endDate) {
      const gapDateStr = loopDate.toISOString().split('T')[0];
      if (!data.dailyRecords[gapDateStr]) {
        data.dailyRecords[gapDateStr] = { seconds: 0, lectures: [] };
      }
      loopDate.setDate(loopDate.getDate() + 1);
    }
  }

  // Update streak logic
  if (data.lastStudyDate !== todayStr) {
    // Check if yesterday
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setMinutes(yesterday.getMinutes() - yesterday.getTimezoneOffset());
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    if (data.lastStudyDate === yesterdayStr) {
      data.streak += 1;
    } else {
      data.streak = 1; // reset streak if missed a day
    }
    data.lastStudyDate = todayStr;
  }

  data.totalSeconds += seconds;

  if (!data.dailyRecords[todayStr]) {
    data.dailyRecords[todayStr] = { seconds: 0, lectures: [] };
  }

  data.dailyRecords[todayStr].seconds += seconds;
  
  // Add or update lecture
  let existingLecture = data.dailyRecords[todayStr].lectures.find(l => l.course === course && l.title === title);
  if (existingLecture) {
    existingLecture.seconds += seconds;
  } else {
    data.dailyRecords[todayStr].lectures.push({
      course,
      title,
      seconds,
      link,
      ...extraData,
      timestamp: Date.now()
    });
  }

  saveLocalData(data);

  // Sync to cloud if premium and 24 hours have passed since last sync
  syncToCloudIfNeeded(data, todayStr);
};

export const syncToCloudIfNeeded = async (data = null, todayStr = null) => {
  const isPremium = localStorage.getItem('naino_premium_member') === 'true';
  const token = localStorage.getItem('naino_access_token');
  
  if (!isPremium || !token || token === 'XXXXXX') return;

  const currentData = data || getLocalData();
  const today = todayStr || getTodayDateString();
  const now = Date.now();
  
  // 24 hours = 86400000 ms
  if (!currentData.lastCloudSync || (now - currentData.lastCloudSync > 86400000)) {
    try {
      const uuid = localStorage.getItem('naino_device_uuid');
      // Sync main stats
      await fetchBackendAPI('/api/keys/subcollection', 'POST', {
        code: token,
        deviceId: uuid,
        subcollection: 'progress_stats',
        docId: 'main',
        action: 'set',
        data: {
          streak: currentData.streak,
          lastStudyDate: currentData.lastStudyDate,
          totalSeconds: currentData.totalSeconds,
          lastCloudSync: now,
          registrationDate: currentData.registrationDate
        }
      });

      // Sync today's records
      if (currentData.dailyRecords[today]) {
        await fetchBackendAPI('/api/keys/subcollection', 'POST', {
          code: token,
          deviceId: uuid,
          subcollection: 'daily_records',
          docId: today,
          action: 'set',
          data: currentData.dailyRecords[today]
        });
      }

      // Update local lastCloudSync
      currentData.lastCloudSync = now;
      saveLocalData(currentData);
      console.log("Cloud sync completed successfully.");
    } catch (e) {
      console.error("Cloud sync failed:", e);
    }
  }
};

export const getProgressStats = async () => {
  const data = getLocalData();
  const isPremium = localStorage.getItem('naino_premium_member') === 'true';
  const token = localStorage.getItem('naino_access_token');
  
  // If stats are empty locally but user is premium, try to recover from cloud
  if (data.totalSeconds === 0 && isPremium && token && token !== 'XXXXXX') {
    try {
      const uuid = localStorage.getItem('naino_device_uuid');
      const response = await fetchBackendAPI('/api/keys/subcollection', 'POST', {
        code: token,
        deviceId: uuid,
        subcollection: 'progress_stats',
        docId: 'main',
        action: 'get'
      });
      
      if (response.exists) {
        const cloudStats = response.data;
        data.streak = cloudStats.streak || 0;
        data.lastStudyDate = cloudStats.lastStudyDate || null;
        data.totalSeconds = cloudStats.totalSeconds || 0;
        data.lastCloudSync = cloudStats.lastCloudSync || null;
        if (cloudStats.registrationDate) {
          data.registrationDate = cloudStats.registrationDate;
        }
        saveLocalData(data);
      }
    } catch (e) {
      console.error("Failed to recover main stats from cloud", e);
    }
  }
  
  return data;
};
