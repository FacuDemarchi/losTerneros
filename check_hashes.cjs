
const crypto = require('crypto');

function hash(pwd) {
    return crypto.createHash('sha256').update(pwd).digest('hex');
}

const targetHash = 'bd5b6cb8b6ce776ee8bf95620ea614ee46a983a9bfede296e1c8b5e7b7fdbc57'; // Del .env

const candidates = ['juli', 'Juli', 'JULI', 'julian', 'Julian', '1234', 'admin', 'master'];

console.log('Target Hash:', targetHash);
candidates.forEach(c => {
    const h = hash(c);
    console.log(`Hash of "${c}": ${h} ${h === targetHash ? 'MATCH!' : ''}`);
});

const dbHash = 'eba744c8533dec47ebe77f389fa160806e1b4b9610dbe63d4273547c6ec22def'; // De check_juli.cjs
console.log('\nDB Hash (juli):', dbHash);
console.log(`Hash of "juli": ${hash('juli')} ${hash('juli') === dbHash ? 'MATCH!' : ''}`);
