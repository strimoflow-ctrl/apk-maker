export const isItemLocked = (item) => {
  const isPremiumUser = localStorage.getItem('naino_premium_member') === 'true';
  
  if (isPremiumUser) return false;

  return Boolean(item?.isPremium) && item?.isPremium !== 'false' && item?.isPremium !== false && item?.isPremium !== 0 && item?.isPremium !== '';
};
