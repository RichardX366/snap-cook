import axios from 'axios';
import { cookies } from '../routes/main';

export const fetchImages = async (query: string) => {
  const { data: response } = await axios.get<string>(
    `https://www.google.com/search?tbm=isch&q=${query}`,
    {
      headers: {
        Cookie: cookies,
      } as any,
    },
  );
  const images = response
    .split('https://')
    .filter((url) => url.includes('encrypted-tbn0.gstatic.com/images?q=tbn:'))
    .map((image) => `https://${image.split('&amp;')[0]}`);
  return images.slice(0, images.length - 2);
};
