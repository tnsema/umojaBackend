import bcrypt from "bcrypt";
import config from "../config/config.js";

const key = config.secretKey;

export const generatePassword = (password) => {
  try {
    let salt = bcrypt.genSaltSync(10);
    let hash = bcrypt.hashSync(password, salt);

    return {
      passwordStatus: true,
      hash,
    };
  } catch (err) {
    return {
      passwordStatus: false,
    };
  }
};

export const comparePassword = (password, hashPassword) => {
  try {
    let comparePwd = bcrypt.compareSync(password, hashPassword);

    return {
      passwordStatus: comparePwd,
    };
  } catch (err) {
    return {
      passwordStatus: false,
    };
  }
};

// Function to encrypt a string
export const encryptString = async (password) => {
  const encrypted = CryptoJS.AES.encrypt(password, key).toString();
  return encrypted;
};

// Function to decrypt a string
export const decryptString = async (encryptedString) => {
  const bytes = CryptoJS.AES.decrypt(encryptedString, key);
  const decrypted = bytes.toString(CryptoJS.enc.Utf8);
  return decrypted;
};
