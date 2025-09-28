#!/usr/bin/env node
const https = require('https');
const fs = require('fs');
const path = require('path');

const CONFIG = {
  username: 'niranjans20', // Change this to your GitHub username
  duration: '15s',
  cellSize: 11,
  cellGap: 3,
  viewBoxWidth: 1000,
  viewBoxHeight: 280,
  background: '#0D1117',
  snakeColors: ['#E91E63', '#9C27B0', '#673AB7', '#3F51B5', '#2196F3'],
  progressColor: '#39D353',
  textColor: '#7d8590',
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
            totalContributions
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
    'User-Agent': 'GitHub-Profile-Snake-v1.0'
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
  let totalContributions = 0;
  
  for (let week = 0; week < 53; week++) {
    const contributionDays = [];
    for (let day = 0; day < 7; day++) {
      const count = Math.floor(Math.random() * 15);
      totalContributions += count;
      contributionDays.push({
        contributionCount: count,
        date: new Date(Date.now() - (53 - week) * 7 * 24 * 60 * 60 * 1000 + day * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    weeks.push({ contributionDays });
  }
  
  return { 
    user: { 
      contributionsCollection: { 
        contributionCalendar: { 
          weeks,
          totalContributions
        } 
      } 
    } 
  };
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
    console.log('⚠️  Using fallback random contributions data');
    data = generateRandomContributions();
  }

  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  const totalContributions = data.user.contributionsCollection.contributionCalendar.totalContributions || 0;
  const grid = [];
  
  // Initialize grid
  for (let day = 0; day < 7; day++) {
    grid[day] = [];
  }
  
  // Fill grid with contribution data
  weeks.forEach(week => {
    week.contributionDays.forEach((day, dayIndex) => {
      const intensity = getIntensityLevel(day.contributionCount);
      grid[dayIndex].push(intensity);
    });
  });
  
  return { grid, totalContributions };
}

function generateSVG(contributionGrid, totalContributions) {
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
     aria-label="Animated Snake eating through GitHub contribution graph for ${CONFIG.username}">
  
  <title>Slither Snake Contribution Eater - ${CONFIG.username}</title>
  <desc>An animated visualization showing a snake slithering through ${totalContributions} GitHub contributions</desc>
  
  <defs>
    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${CONFIG.progressColor}"/>
      <stop offset="50%" stop-color="#26A641"/>
      <stop offset="100%" stop-color="#006D32"/>
    </linearGradient>
    
    <linearGradient id="snakeGradient1" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CONFIG.snakeColors[0]}"/>
      <stop offset="100%" stop-color="#FF6B9D"/>
    </linearGradient>
    
    <linearGradient id="snakeGradient2" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CONFIG.snakeColors[1]}"/>
      <stop offset="100%" stop-color="#E1BEE7"/>
    </linearGradient>
    
    <linearGradient id="snakeGradient3" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CONFIG.snakeColors[2]}"/>
      <stop offset="100%" stop-color="#D1C4E9"/>
    </linearGradient>
    
    <linearGradient id="snakeGradient4" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CONFIG.snakeColors[3]}"/>
      <stop offset="100%" stop-color="#C5CAE9"/>
    </linearGradient>
    
    <linearGradient id="snakeGradient5" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${CONFIG.snakeColors[4]}"/>
      <stop offset="100%" stop-color="#BBDEFB"/>
    </linearGradient>
    
    <filter id="glow">
      <feGaussianBlur stdDeviation="1.5" result="coloredBlur"/>
      <feMerge> 
        <feMergeNode in="coloredBlur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>
    
    <filter id="shadow">
      <feDropShadow dx="2" dy="2" stdDeviation="2" flood-opacity="0.3"/>
    </filter>
  </defs>
  
  <rect width="100%" height="100%" fill="${CONFIG.background}"/>
  
  <!-- Day labels -->
  <text x="30" y="${gridStartY + cellPitch + 4}" fill="${CONFIG.textColor}" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" 
        font-size="11">Mon</text>
  <text x="30" y="${gridStartY + 3 * cellPitch + 4}" fill="${CONFIG.textColor}" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" 
        font-size="11">Wed</text>
  <text x="30" y="${gridStartY + 5 * cellPitch + 4}" fill="${CONFIG.textColor}" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" 
        font-size="11">Fri</text>
  
  <g id="contributionGrid">`;

  // Generate contribution grid
  contributionGrid.forEach((row, rowIndex) => {
    row.forEach((intensity, colIndex) => {
      const x = gridStartX + colIndex * cellPitch;
      const y = gridStartY + rowIndex * cellPitch;
      const baseColor = CONFIG.intensityColors[intensity];
      
      // Calculate when snake reaches this cell
      const columnPosition = gridStartX + colIndex * cellPitch;
      const snakeReachTime = ((columnPosition - snakeStartX) / totalDistance) * parseFloat(CONFIG.duration);
      
      svg += `
    <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${baseColor}" 
          stroke="#333" stroke-width="0.5">
      <animate attributeName="fill" 
               values="${baseColor};${CONFIG.eatColor};${baseColor}" 
               dur="0.5s" 
               begin="${snakeReachTime.toFixed(2)}s"
               repeatCount="indefinite"/>
      <animate attributeName="stroke-width" 
               values="0.5;2;0.5" 
               dur="0.5s" 
               begin="${snakeReachTime.toFixed(2)}s"
               repeatCount="indefinite"/>
    </rect>`;
    });
  });

  svg += `
  </g>
  
  <!-- Snake -->
  <g id="snake">
    
    <!-- Snake Head -->
    <rect x="${snakeStartX - 8}" y="${snakeY - 8}" width="16" height="16" rx="4" 
          fill="url(#snakeGradient1)" stroke="#FF1744" stroke-width="2" filter="url(#glow)">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Snake eyes -->
    <circle cx="${snakeStartX - 5}" cy="${snakeY - 3}" r="1.5" fill="#000">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </circle>
    <circle cx="${snakeStartX - 1}" cy="${snakeY - 3}" r="1.5" fill="#000">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </circle>
    
    <!-- Body Segment 1 -->
    <rect x="${snakeStartX - 32}" y="${snakeY - 7}" width="15" height="14" rx="3" 
          fill="url(#snakeGradient2)" stroke="#E91E63" stroke-width="1.5" filter="url(#shadow)">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 2 -->
    <rect x="${snakeStartX - 54}" y="${snakeY - 6}" width="13" height="12" rx="3" 
          fill="url(#snakeGradient3)" stroke="#9C27B0" stroke-width="1.5" filter="url(#shadow)">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 3 -->
    <rect x="${snakeStartX - 74}" y="${snakeY - 5}" width="11" height="10" rx="2" 
          fill="url(#snakeGradient4)" stroke="#673AB7" stroke-width="1" filter="url(#shadow)">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Body Segment 4 -->
    <rect x="${snakeStartX - 92}" y="${snakeY - 4}" width="9" height="8" rx="2" 
          fill="url(#snakeGradient5)" stroke="#3F51B5" stroke-width="1" filter="url(#shadow)">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
    </rect>
    
    <!-- Tail -->
    <rect x="${snakeStartX - 106}" y="${snakeY - 3}" width="7" height="6" rx="2" 
          fill="${CONFIG.snakeColors[4]}" stroke="#2196F3" stroke-width="1" opacity="0.9">
      <animateTransform attributeName="transform" 
                       type="translate" 
                       values="0,0;${totalDistance},0" 
                       dur="${CONFIG.duration}" 
                       repeatCount="indefinite"/>
      <animate attributeName="opacity" 
               values="0.9;0.5;0.9" 
               dur="2s" 
               repeatCount="indefinite"/>
    </rect>
    
  </g>
  
  <!-- Progress bar -->
  <g id="progressBar" transform="translate(${gridStartX}, ${gridStartY + gridHeight + 45})">
    <rect x="0" y="0" width="${gridWidth}" height="10" rx="5" fill="#1f242d" stroke="#333" stroke-width="1"/>
    
    <rect x="0" y="0" width="0" height="10" rx="5" fill="url(#progressGradient)">
      <animate attributeName="width" 
               values="0;${gridWidth}" 
               dur="${CONFIG.duration}" 
               repeatCount="indefinite"/>
    </rect>
    
    <!-- Progress text -->
    <text x="${gridWidth / 2}" y="32" text-anchor="middle" fill="${CONFIG.progressColor}" 
          font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" 
          font-size="14" font-weight="bold">
      <animate attributeName="opacity" values="1;0.6;1" dur="2s" repeatCount="indefinite"/>
      🐍 Slithering through ${totalContributions} contributions...
    </text>
  </g>
  
  <!-- Header stats -->
  <text x="${viewBoxWidth - 20}" y="25" text-anchor="end" fill="${CONFIG.snakeColors[0]}" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" 
        font-size="14" font-weight="bold">
    @${CONFIG.username}
  </text>
  
  <text x="${viewBoxWidth - 20}" y="45" text-anchor="end" fill="${CONFIG.textColor}" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" 
        font-size="11">
    ${contributionGrid[0].length} weeks • ${totalContributions} contributions
  </text>
  
  <!-- Animated particles -->
  <g id="particles">
    <circle cx="150" cy="35" r="1" fill="${CONFIG.progressColor}" opacity="0.7">
      <animate attributeName="opacity" values="0;1;0" dur="3s" repeatCount="indefinite"/>
      <animate attributeName="r" values="1;2;1" dur="3s" repeatCount="indefinite"/>
    </circle>
    <circle cx="300" cy="240" r="1" fill="${CONFIG.snakeColors[1]}" opacity="0.5">
      <animate attributeName="opacity" values="0;1;0" dur="4s" begin="1s" repeatCount="indefinite"/>
      <animate attributeName="r" values="1;1.5;1" dur="4s" begin="1s" repeatCount="indefinite"/>
    </circle>
    <circle cx="500" cy="30" r="1" fill="${CONFIG.snakeColors[2]}" opacity="0.6">
      <animate attributeName="opacity" values="0;1;0" dur="2.5s" begin="2s" repeatCount="indefinite"/>
      <animate attributeName="r" values="1;2.5;1" dur="2.5s" begin="2s" repeatCount="indefinite"/>
    </circle>
    <circle cx="700" cy="245" r="1" fill="${CONFIG.progressColor}" opacity="0.4">
      <animate attributeName="opacity" values="0;1;0" dur="3.5s" begin="0.5s" repeatCount="indefinite"/>
      <animate attributeName="r" values="1;1.8;1" dur="3.5s" begin="0.5s" repeatCount="indefinite"/>
    </circle>
  </g>
  
</svg>`;

  return svg;
}

async function main() {
  console.log(`🐍 Starting Snake contribution generator...`);
  console.log(`👤 Fetching contributions for: ${CONFIG.username}`);
  
  const token = process.env.GITHUB_TOKEN;
  if (token) {
    console.log('🔑 Using GitHub token for API access');
  } else {
    console.log('⚠️  No GitHub token found, API rate limits may apply');
  }
  
  const data = await fetchContributions(CONFIG.username, token);
  
  console.log('📊 Processing contribution data...');
  const { grid: contributionGrid, totalContributions } = processContributionsData(data);
  
  console.log('🎨 Generating Snake SVG animation...');
  const svg = generateSVG(contributionGrid, totalContributions);
  
  // Ensure assets directory exists
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    console.log('📁 Creating assets directory...');
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Write SVG file
  const svgPath = path.join(assetsDir, 'slither-contrib.svg');
  fs.writeFileSync(svgPath, svg);
  
  console.log('✅ Successfully generated Snake SVG!');
  console.log(`📍 File location: ${svgPath}`);
  console.log(`📈 Grid dimensions: ${contributionGrid[0].length} weeks × 7 days`);
  console.log(`🎯 Total contributions: ${totalContributions}`);
  console.log(`⏱️  Animation duration: ${CONFIG.duration}`);
  console.log(`🐍 Snake will slither through your coding journey!`);
  
  return svgPath;
}

// Error handling for main execution
if (require.main === module) {
  main()
    .then((svgPath) => {
      console.log(`🎉 Snake animation ready: ${path.basename(svgPath)}`);
      process.exit(0);
    })
    .catch((error) => {
      console.error('❌ Error generating Snake animation:', error.message);
      process.exit(1);
    });
}

module.exports = { main, CONFIG, fetchContributions, processContributionsData, generateSVG };
