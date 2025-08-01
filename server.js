const express = require('express');
const path = require('path');
const https = require('https'); // https 모듈 추가
const app = express();
const port = 8080;

// 모든 요청에 대해 클라이언트의 IP 주소와 요청 URL을 기록하는 미들웨어
app.use((req, res, next) => {
    // 프록시 서버를 거치는 경우 'x-forwarded-for' 헤더를 사용
    const clientIp = req.headers['x-forwarded-for'] || req.ip;
    console.log(`[접속 감지] IP 주소: ${clientIp}, 요청 URL: ${req.originalUrl}`);
    next();
});

// 정적 파일(HTML, CSS, JS)을 제공하기 위한 미들웨어 설정
app.use(express.static(path.join(__dirname, '')));

// index.html 파일을 루트 경로로 접속했을 때 제공
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 서버의 공인 IP 주소를 가져오는 함수
const getPublicIp = () => {
    return new Promise((resolve, reject) => {
        https.get('https://api.ipify.org', (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                resolve(data);
            });
        }).on('error', (err) => {
            reject(err);
        });
    });
};

// 서버를 시작하고 공인 IP 주소를 출력
getPublicIp()
    .then(publicIp => {
        app.listen(port, '0.0.0.0', () => {
            console.log(`서버가 http://0.0.0.0:${port} 에서 실행 중입니다.`);
            console.log(`로컬에서 접속: http://localhost:${port}`);
            console.log(`외부에서 접속 가능한 공인 IP 주소: http://${publicIp}:${port}`);
            console.log("대신고 309 임시 주소:: http://172.16.1.231:8080/")
        });
    })
    .catch(err => {
        console.error('공인 IP를 가져오는 데 실패했습니다:', err.message);
        // 공인 IP를 가져오지 못해도 서버는 시작
        app.listen(port, '0.0.0.0', () => {
            console.log(`서버가 http://0.0.0.0:${port} 에서 실행 중입니다.`);
            console.log(`로컬에서 접속: http://localhost:${port}`);
            console.log('공인 IP를 가져올 수 없어 표시하지 않습니다.');
        });
    });