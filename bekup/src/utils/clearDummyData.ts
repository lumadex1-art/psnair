/**
 * Utility to clear dummy data from localStorage
 * This helps clean up any old test data that might be cached
 */

export const clearAllDummyData = () => {
  const keys = Object.keys(localStorage);
  let clearedCount = 0;
  
  keys.forEach(key => {
    if (key.startsWith('epsilonDropState_')) {
      try {
        const data = JSON.parse(localStorage.getItem(key) || '{}');
        
        // Check for various dummy data patterns
        const isDummy = 
          data.user?.name === 'Test User' ||
          data.user?.name === 'Anonymous User' ||
          data.user?.username === '@testuser' ||
          data.user?.username === 'testuser' ||
          data.referralCode === 'EPSILON42' ||
          (data.user?.avatar && data.user.avatar.includes('picsum.photos'));
        
        if (isDummy) {
          localStorage.removeItem(key);
          clearedCount++;
        }
      } catch (e) {
        // Invalid JSON, remove it
        localStorage.removeItem(key);
        clearedCount++;
      }
    }
  });
  
  return clearedCount;
};

export const isDummyUser = (user: any): boolean => {
  if (!user) return false;
  
  return (
    user.name === 'Test User' ||
    user.name === 'Anonymous User' ||
    user.username === '@testuser' ||
    user.username === 'testuser' ||
    (user.avatar && user.avatar.includes('picsum.photos'))
  );
};
