const fs = require('fs');
const path = require('path');

console.log('--- Diagnostic Report ---');
console.log('Current Directory:', process.cwd());

const envPath = path.join(process.cwd(), '.env.local');
const envExists = fs.existsSync(envPath);
console.log('.env.local exists:', envExists);

if (envExists) {
    const content = fs.readFileSync(envPath, 'utf8');
    const lines = content.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
    console.log('Detected Keys in .env.local:');
    lines.forEach(line => {
        const key = line.split('=')[0];
        console.log(` - ${key}`);
    });
} else {
    console.log('Listing all files in root (non-recursive):');
    fs.readdirSync(process.cwd()).forEach(file => {
        console.log(` - ${file}`);
    });
}

console.log('-------------------------');
