export const isItemLocked = (item) => {
  const isPremiumUser = localStorage.getItem('naino_premium_member') === 'true';
  
  if (isPremiumUser) return false;

  return item?.isPremium === true;
};
