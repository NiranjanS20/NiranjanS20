#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  username: 'niranjans20',
  duration: '10s',
  cellSize: 12,
  cellGap: 2,
  viewBoxWidth: 940,
  viewBoxHeight: 260,
  background: '#0D1117',
  pacmanGradient: {
    start: '#FFD54F',
    end: '#FF8F00'
  },
  progressTrack: '#1f242d',
  intensityColors: {
    0: '#161B22',
    1: '#0E4429',
    2: '#006D32',
    3: '#26A641',
    4: '#39D353'
  },
  eatColor: '#39D353'
};

async function fetchContributions(username, token = null) {
  const query = `
    query($username: String!) {
      user(login: $username) {
        contributionsCollection {
          contributionCalendar {
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

  const headers = {
    'Content-Type': 'application/json',
    'User-Agent': 'GitHub-Profile-Pac-Man'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  return new Promise((resolve) => {
    const data = JSON.stringify({
      query: query,
      variables: { username: username }
    });

    const options = {
      hostname: 'api.github.com',
      port: 443,
      path: '/graphql',
      method: 'POST',
      headers: {
        ...headers,
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          if (response.errors) {
            console.warn('GitHub API errors:', response.errors);
            resolve(null);
          } else {
            resolve(response.data);
          }
        } catch (error) {
          console.warn('Failed to parse GitHub response:', error.message);
          resolve(null);
        }
      });
    });

    req.on('error', (error) => {
      console.warn('GitHub API request failed:', error.message);
      resolve(null);
    });

    req.write(data);
    req.end();
  });
}

function generateRandomContributions() {
  const weeks = [];
  for (let week = 0; week < 52; week++) {
    const contributionDays = [];
    for (let day = 0; day < 7; day++) {
      contributionDays.push({
        contributionCount: Math.floor(Math.random() * 15),
        date: new Date(Date.now() - (52 - week) * 7 * 24 * 60 * 60 * 1000 + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    weeks.push({ contributionDays });
  }
  return { user: { contributionsCollection: { contributionCalendar: { weeks } } } };
}

function getIntensityLevel(count) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

function processContributionsData(data) {
  if (!data || !data.user || !data.user.contributionsCollection) {
    console.log('Using fallback random contributions data');
    data = generateRandomContributions();
  }

  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  const grid = [];
  
  for (let day = 0; day < 7; day++) {
    grid[day] = [];
  }
  
  weeks.forEach(week => {
    week.contributionDays.forEach((day, dayIndex) => {
      const intensity = getIntensityLevel(day.contributionCount);
      grid[dayIndex].push(intensity);
    });
  });
  
  return grid;
}

function generateSVG(contributionGrid) {
  const { cellSize, cellGap, viewBoxWidth, viewBoxHeight } = CONFIG;
  const cellPitch = cellSize + cellGap;
  const gridWidth = contributionGrid[0].length * cellPitch - cellGap;
  const gridHeight = 7 * cellPitch - cellGap;
  const gridStartX = 50;
  const gridStartY = 40;
  
  const pacmanStartX = gridStartX - 30;
  const pacmanEndX = gridStartX + gridWidth + 30;
  const pacmanY = gridStartY + gridHeight / 2;
  const totalDistance = pacmanEndX - pacmanStartX;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${viewBoxWidth}" height="${viewBoxHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" 
     xmlns="http://www.w3.org/2000/svg" role="img" 
     aria-label="Animated Pac-Man eating through GitHub contribution graph">
  
  <title>Pac-Man Contribution Eater Animation</title>
  
  <defs>
    <radialGradient id="pacmanGradient" cx="0.3" cy="0.3">
      <stop offset="0%" stop-color="${CONFIG.pacmanGradient.start}"/>
      <stop offset="100%" stop-color="${CONFIG.pacmanGradient.end}"/>
    </radialGradient>
    
    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${CONFIG.pacmanGradient.start}"/>
      <stop offset="100%" stop-color="${CONFIG.pacmanGradient.end}"/>
    </linearGradient>
  </defs>
  
  <rect width="100%" height="100%" fill="${CONFIG.background}"/>
  
  <text x="20" y="${gridStartY + cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Mon</text>
  <text x="20" y="${gridStartY + 3 * cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Wed</text>
  <text x="20" y="${gridStartY + 5 * cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Fri</text>
  
  <g id="contributionGrid">`;

  contributionGrid.forEach((row, rowIndex) => {
    row.forEach((intensity, colIndex) => {
      const x = gridStartX + colIndex * cellPitch;
      const y = gridStartY + rowIndex * cellPitch;
      const baseColor = CONFIG.intensityColors[intensity];
      
      const columnPosition = gridStartX + colIndex * cellPitch;
      const pacmanReachTime = ((columnPosition - pacmanStartX) / totalDistance) * parseFloat(CONFIG.duration);
      
      svg += `
    <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${baseColor}">
      <animate attributeName="fill" 
               values="${baseColor};${CONFIG.eatColor};${baseColor}" 
               dur="0.5s" 
               begin="${pacmanReachTime.toFixed(2)}s"/>
    </rect>`;
    });
  });

  svg += `
  </g>
  
  <g id="pacman">
    <circle cx="${pacmanStartX}" cy="${pacmanY}" r="15" fill="url(#pacmanGradient)">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </circle>
    
    <polygon points="${pacmanStartX},${pacmanY} ${pacmanStartX + 20},${pacmanY - 12} ${pacmanStartX + 20},${pacmanY + 12}" 
             fill="${CONFIG.background}">
      <animateTransform attributeName="transform" 
                       type="rotate translate" 
                       values="0 ${pacmanStartX} ${pacmanY}, 0,0;30 ${pacmanStartX} ${pacmanY}, 0,0;0 ${pacmanStartX} ${pacmanY}, 0,0;-30 ${pacmanStartX} ${pacmanY}, 0,0;0 ${pacmanStartX} ${pacmanY}, 0,0" 
                       dur="0.4s" 
                       repeatCount="indefinite"/>
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"
                       additive="sum"/>
    </polygon>
    
    <circle cx="${pacmanStartX - 3}" cy="${pacmanY - 6}" r="2" fill="#000">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </circle>
  </g>
  
  <g id="progressBar" transform="translate(${gridStartX}, ${gridStartY + gridHeight + 30})">
    <rect x="0" y="0" width="${gridWidth}" height="8" rx="4" fill="${CONFIG.progressTrack}"/>
    
    <rect x="0" y="0" width="0" height="8" rx="4" fill="url(#progressGradient)">
      <animate attributeName="width" 
               values="0;${gridWidth}" 
               dur="${CONFIG.duration}" 
               repeatCount="indefinite"/>
    </rect>
    
    <text x="${gridWidth / 2}" y="25" text-anchor="middle" fill="#7d8590" 
          font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">
      Eating contributions...
      <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
    </text>
  </g>
  
</svg>`;

  return svg;
}

async function main() {
  console.log(`Fetching contributions for ${CONFIG.username}...`);
  
  const token = process.env.GITHUB_TOKEN;
  const data = await fetchContributions(CONFIG.username, token);
  
  console.log('Processing contribution data...');
  const contributionGrid = processContributionsData(data);
  
  console.log('Generating animated SVG...');
  const svg = generateSVG(contributionGrid);
  
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  const svgPath = path.join(assetsDir, 'pacman-contrib.svg');
  fs.writeFileSync(svgPath, svg);
  
  console.log(`Generated animated SVG: ${svgPath}`);
  
  return svgPath;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, CONFIG };
