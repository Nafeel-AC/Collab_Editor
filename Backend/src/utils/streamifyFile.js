import { Readable } from 'stream';

/**
 * Convert a buffer to a readable stream for Cloudinary upload
 * @param {Buffer} buffer - The file buffer
 * @returns {Readable} - A readable stream from the buffer
 */
export const bufferToStream = (buffer) => {
  const readable = new Readable({
    read() {
      this.push(buffer);
      this.push(null);
    }
  });
  return readable;
};

export default bufferToStream; 