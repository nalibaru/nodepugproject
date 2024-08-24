import bcrypt from 'bcrypt';

const saltRounds = 10;

const hashPassword = async (password) => {
  return await bcrypt.hash(password, saltRounds);
};

export { hashPassword };