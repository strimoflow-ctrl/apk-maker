const IMGBB_API_KEY = import.meta.env.VITE_IMGBB_API_KEY;

export const uploadImageToImgBB = async (imageFile) => {
  const formData = new FormData();
  
  if (typeof imageFile === 'string' && imageFile.startsWith('data:image')) {
    // Strip the data:image/jpeg;base64, prefix for ImgBB
    const base64Data = imageFile.split(',')[1];
    formData.append('image', base64Data);
  } else {
    // Handle File object directly
    formData.append('image', imageFile);
  }

  try {
    const response = await fetch(`https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`, {
      method: 'POST',
      body: formData
    });

    const data = await response.json();

    if (data.success) {
      return data.data.url; // Return the direct URL to the image
    } else {
      throw new Error(data.error?.message || "Upload failed");
    }
  } catch (error) {
    console.error('ImgBB Upload Error:', error);
    throw error;
  }
};
