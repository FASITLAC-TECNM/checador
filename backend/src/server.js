import dotenv from 'dotenv';
import app from './app.js';

dotenv.config();

const PORT = process.env.PORT;

app.listen(PORT, () => {
    const line = '─'.repeat(45);
    console.log(`\n${line}`);
    console.log('🚀 FASITLAC Backend Server');
    console.log(`${line}`);
    console.log(`📦 ${process.env.NODE_ENV}`);
    console.log(`🛠️ http://localhost:${PORT}`);
    console.log(`🕓 ${new Date().toLocaleString()}`);
    console.log(`${line}\n`);
});

