const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateSessionCode(length = 6) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

module.exports = generateSessionCode; 