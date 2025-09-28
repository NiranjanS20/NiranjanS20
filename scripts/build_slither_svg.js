#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  username: 'niranjans20',
  duration: '15s',
  cellSize: 11,
  cellGap: 3,
  viewBoxWidth: 1000,
  viewBoxHeight: 280,
  background: '#0D1117',
  snakeColors: ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
  progressColor: '#39D353',
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
    'User-Agent': 'GitHub-Profile-Snake'
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
  for (let week = 0; week < 53; week++) {
    const contributionDays = [];
    for (let day = 0; day < 7; day++) {
      contributionDays.push({
        contributionCount: Math.floor(Math.random() * 12),
        date: new Date(Date.now() - (53 - week) * 7 * 24 * 60 * 60 * 1000 + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    weeks.push({ contributionDays });
  }
  return { user: { contributionsCollection: { contributionCalendar: { weeks } } } };
}

function getIntensityLevel(count) {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 8) return 3;
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
  const gridStartX = 60;
  const gridStartY = 50;
  
  const snakeStartX = gridStartX - 120;
  const snakeEndX = gridStartX + gridWidth + 50;
  const snakeY = gridStartY + gridHeight / 2;
  const totalDistance = snakeEndX - snakeStartX;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${viewBoxWidth}" height="${viewBoxHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" 
     xmlns="http://www.w3.org/2000/svg" role="img" 
     aria-label="Animated Snake eating through GitHub contribution graph">
  
  <title>Slither Snake Contribution Eater</title>
  
  <defs>
    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${CONFIG.progressColor}"/>
      <stop offset="100%" stop-color="#26A641"/>
    </linearGradient>
  </defs>
  
  <rect width="100%" height="100%" fill="${CONFIG.background}"/>
  
  <text x="30" y="${gridStartY + cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Mon</text>
  <text x="30" y="${gridStartY + 3 * cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Wed</text>
  <text x="30" y="${gridStartY + 5 * cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Fri</text>
  
  <g id="contributionGrid">`;

  contributionGrid.forEach((row, rowIndex) => {
    row.forEach((intensity, colIndex) => {
      const x = gridStartX + colIndex * cellPitch;
      const y = gridStartY + rowIndex * cellPitch;
      const baseColor = CONFIG.intensityColors[intensity];
      
      const columnPosition = gridStartX + colIndex * cellPitch;
      const snakeReachTime = ((columnPosition - snakeStartX) / totalDistance) * parseFloat(CONFIG.duration);
      
      svg += `
    <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${baseColor}">
      <animate attributeName="fill" 
               values="${baseColor};${CONFIG.eatColor};${baseColor}" 
               dur="0.4s" 
               begin="${snakeReachTime.toFixed(2)}s"
               repeatCount="indefinite"/>
    </rect>`;
    });
  });

  svg += `
  </g>
  
  <g id="snake">
    
    <!-- Snake Head (square) -->
    <rect x="${snakeStartX - 8}" y="${snakeY - 8}" width="16" height="16" rx="3" fill="${CONFIG.snakeColors[0]}" stroke="#FF6B9D" stroke-width="2">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 1 -->
    <rect x="${snakeStartX - 32}" y="${snakeY - 7}" width="14" height="14" rx="2" fill="${CONFIG.snakeColors[1]}" stroke="#BA68C8" stroke-width="1">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 2 -->
    <rect x="${snakeStartX - 54}" y="${snakeY - 6}" width="12" height="12" rx="2" fill="${CONFIG.snakeColors[2]}" stroke="#9575CD" stroke-width="1">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 3 -->
    <rect x="${snakeStartX - 74}" y="${snakeY - 5}" width="10" height="10" rx="2" fill="${CONFIG.snakeColors[3]}" stroke="#7986CB" stroke-width="1">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 4 -->
    <rect x="${snakeStartX - 92}" y="${snakeY - 4}" width="8" height="8" rx="2" fill="${CONFIG.snakeColors[4]}" stroke="#64B5F6" stroke-width="1">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Tail -->
    <rect x="${snakeStartX - 106}" y="${snakeY - 3}" width="6" height="6" rx="2" fill="${CONFIG.snakeColors[4]}" stroke="#64B5F6" stroke-width="1" opacity="0.8">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
  </g>
  
  <!-- Progress bar -->
  <g id="progressBar" transform="translate(${gridStartX}, ${gridStartY + gridHeight + 40})">
    <rect x="0" y="0" width="${gridWidth}" height="10" rx="5" fill="#1f242d"/>
    
    <rect x="0" y="0" width="0" height="10" rx="5" fill="url(#progressGradient)">
      <animate attributeName="width" 
               values="0;${gridWidth}" 
               dur="${CONFIG.duration}" 
               repeatCount="indefinite"/>
    </rect>
    
    <text x="${gridWidth / 2}" y="30" text-anchor="middle" fill="${CONFIG.progressColor}" 
          font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="14" font-weight="bold">
      🐍 Collecting contributions...
    </text>
  </g>
  
  <!-- Stats -->
  <text x="${viewBoxWidth - 20}" y="30" text-anchor="end" fill="${CONFIG.snakeColors[0]}" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="14" font-weight="bold">
    ${CONFIG.username}
  </text>
  
  <text x="${viewBoxWidth - 20}" y="50" text-anchor="end" fill="#7d8590" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">
    ${contributionGrid[0].length} weeks collected
  </text>
  
</svg>`;

  return svg;
}

async function main() {
  console.log(`Fetching contributions for ${CONFIG.username}...`);
  
  const token = process.env.GITHUB_TOKEN;
  const data = await fetchContributions(CONFIG.username, token);
  
  console.log('Processing contribution data...');
  const contributionGrid = processContributionsData(data);
  
  console.log('Generating slither snake SVG...');
  const svg = generateSVG(contributionGrid);
  
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  const svgPath = path.join(assetsDir, 'slither-contrib.svg');
  fs.writeFileSync(svgPath, svg);
  
  console.log(`Generated slither snake SVG: ${svgPath}`);
  console.log(`Grid size: ${contributionGrid[0].length} weeks x 7 days`);
  console.log(`Animation duration: ${CONFIG.duration}`);
  
  return svgPath;
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, CONFIG };
