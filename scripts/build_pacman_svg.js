#!/usr/bin/env node

// GitHub Pac-Man Contribution Eater - Complete SVG Builder
// Fetches real GitHub contributions and generates animated SVG

const https = require('https');
const fs = require('fs');
const path = require('path');

// Configuration - easily customizable
const CONFIG = {
  username: 'niranjans20',       // CHANGE THIS TO YOUR USERNAME
  duration: '10s',               // Animation duration
  cellSize: 12,                  // Contribution cell size
  cellGap: 2,                    // Gap between cells
  viewBoxWidth: 940,             // SVG viewBox width
  viewBoxHeight: 260,            // SVG viewBox height
  
  // Colors
  background: '#0D1117',
  pacmanGradient: {
    start: '#FFD54F',
    end: '#FF8F00'
  },
  progressTrack: '#1f242d',
  
  // GitHub contribution intensity colors (dark theme)
  intensityColors: {
    0: '#161B22',  // No contributions
    1: '#0E4429',  // Low
    2: '#006D32',  // Medium low  
    3: '#26A641',  // Medium high
    4: '#39D353'   // High
  },
  
  eatColor: '#39D353'  // Color when Pac-Man "eats" a cell
};

// Fetch GitHub contributions using GraphQL API
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

  return new Promise((resolve, reject) => {
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

// Generate fallback random contribution data
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

// Convert contribution count to intensity level (0-4)
function getIntensityLevel(count) {
  if (count === 0) return 0;
  if (count <= 3) return 1;
  if (count <= 6) return 2;
  if (count <= 9) return 3;
  return 4;
}

// Process contributions data into grid format
function processContributionsData(data) {
  if (!data || !data.user || !data.user.contributionsCollection) {
    console.log('Using fallback random contributions data');
    data = generateRandomContributions();
  }

  const weeks = data.user.contributionsCollection.contributionCalendar.weeks;
  const grid = [];
  
  // Initialize 7 rows (days of week)
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
  
  return grid;
}

// Generate the animated SVG
function generateSVG(contributionGrid) {
  const { cellSize, cellGap, viewBoxWidth, viewBoxHeight } = CONFIG;
  const cellPitch = cellSize + cellGap;
  const gridWidth = contributionGrid[0].length * cellPitch - cellGap;
  const gridHeight = 7 * cellPitch - cellGap;
  const gridStartX = 50;
  const gridStartY = 40;
  
  // Calculate Pac-Man animation timing
  const pacmanStartX = gridStartX - 30;
  const pacmanEndX = gridStartX + gridWidth + 30;
  const pacmanY = gridStartY + gridHeight / 2;
  const totalDistance = pacmanEndX - pacmanStartX;
  
  let svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${viewBoxWidth}" height="${viewBoxHeight}" viewBox="0 0 ${viewBoxWidth} ${viewBoxHeight}" 
     xmlns="http://www.w3.org/2000/svg" role="img" 
     aria-label="Animated Pac-Man eating through GitHub contribution graph with synchronized progress bar">
  
  <title>Pac-Man Contribution Eater Animation</title>
  
  <defs>
    <!-- Pac-Man gradient -->
    <radialGradient id="pacmanGradient" cx="0.3" cy="0.3">
      <stop offset="0%" stop-color="${CONFIG.pacmanGradient.start}"/>
      <stop offset="100%" stop-color="${CONFIG.pacmanGradient.end}"/>
    </radialGradient>
    
    <!-- Progress bar gradient -->
    <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="${CONFIG.pacmanGradient.start}"/>
      <stop offset="100%" stop-color="${CONFIG.pacmanGradient.end}"/>
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="100%" height="100%" fill="${CONFIG.background}"/>
  
  <!-- Day labels -->
  <text x="20" y="${gridStartY + cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Mon</text>
  <text x="20" y="${gridStartY + 3 * cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Wed</text>
  <text x="20" y="${gridStartY + 5 * cellPitch + 4}" fill="#7d8590" font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">Fri</text>
  
  <!-- Contribution grid -->
  <g id="contributionGrid">`;

  // Generate grid cells with eating animation
  contributionGrid.forEach((row, rowIndex) => {
    row.forEach((intensity, colIndex) => {
      const x = gridStartX + colIndex * cellPitch;
      const y = gridStartY + rowIndex * cellPitch;
      const baseColor = CONFIG.intensityColors[intensity];
      
      // Calculate when Pac-Man reaches this column
      const columnPosition = gridStartX + colIndex * cellPitch;
      const pacmanReachTime = ((columnPosition - pacmanStartX) / totalDistance) * parseFloat(CONFIG.duration);
      
      svg += `
    <rect x="${x}" y="${y}" width="${cellSize}" height="${cellSize}" rx="2" fill="${baseColor}">
      <animate attributeName="fill" 
               values="${baseColor};${CONFIG.eatColor};${baseColor}" 
               dur="0.5s" 
               begin="pacmanMove.begin+${pacmanReachTime.toFixed(2)}s"/>
    </rect>`;
    });
  });

  svg += `
  </g>
  
  <!-- Pac-Man -->
  <g id="pacman">
    <!-- Pac-Man body -->
    <circle cx="${pacmanStartX}" cy="${pacmanY}" r="15" fill="url(#pacmanGradient)"/>
    
    <!-- Animated mouth (triangle that cuts into the circle) -->
    <polygon points="${pacmanStartX},${pacmanY} ${pacmanStartX + 20},${pacmanY - 12} ${pacmanStartX + 20},${pacmanY + 12}" 
             fill="${CONFIG.background}">
      <animateTransform attributeName="transform" 
                       type="rotate" 
                       values="0 ${pacmanStartX} ${pacmanY};30 ${pacmanStartX} ${pacmanY};0 ${pacmanStartX} ${pacmanY};-30 ${pacmanStartX} ${pacmanY};0 ${pacmanStartX} ${pacmanY}" 
                       dur="0.4s" 
                       repeatCount="indefinite"/>
    </polygon>
    
    <!-- Eye -->
    <circle cx="${pacmanStartX - 3}" cy="${pacmanY - 6}" r="2" fill="#000"/>
    
    <!-- Movement animation -->
    <animateTransform attributeName="transform" 
                     type="translate" 
                     values="0,0;${totalDistance},0" 
                     dur="${CONFIG.duration}" 
                     repeatCount="indefinite"
                     id="pacmanMove"/>
  </g>
  
  <!-- Progress bar -->
  <g id="progressBar" transform="translate(${gridStartX}, ${gridStartY + gridHeight + 30})">
    <!-- Progress track -->
    <rect x="0" y="0" width="${gridWidth}" height="8" rx="4" fill="${CONFIG.progressTrack}"/>
    
    <!-- Progress fill -->
    <rect x="0" y="0" width="0" height="8" rx="4" fill="url(#progressGradient)">
      <animate attributeName="width" 
               values="0;${gridWidth}" 
               dur="${CONFIG.duration}" 
               repeatCount="indefinite"
               begin="pacmanMove.begin"/>
    </rect>
    
    <!-- Progress text -->
    <text x="${gridWidth / 2}" y="25" text-anchor="middle" fill="#7d8590" 
          font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="12">
      🎮 Eating contributions... 
      <animate attributeName="opacity" values="1;0.3;1" dur="2s" repeatCount="indefinite"/>
    </text>
  </g>
  
  <!-- Stats text -->
  <text x="${viewBoxWidth - 20}" y="${viewBoxHeight - 10}" text-anchor="end" fill="#7d8590" 
        font-family="ui-monospace,SFMono-Regular,SF Mono,Consolas,Liberation Mono,Menlo,monospace" font-size="10">
    ${contributionGrid[0].length} weeks × 7 days • ${CONFIG.duration} loop
  </text>
  
</svg>`;

  return svg;
}

// Main function
async function main() {
  console.log(`🎮 Fetching contributions for ${CONFIG.username}...`);
  
  const token = process.env.GITHUB_TOKEN;
  const data = await fetchContributions(CONFIG.username, token);
  
  console.log('📊 Processing contribution data...');
  const contributionGrid = processContributionsData(data);
  
  console.log('🎨 Generating animated SVG...');
  const svg = generateSVG(contributionGrid);
  
  // Ensure assets directory exists
  const assetsDir = path.join(process.cwd(), 'assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }
  
  // Write SVG file
  const svgPath = path.join(assetsDir, 'assets/pacman.svg');
  fs.writeFileSync(svgPath, svg);
  
  const fileSizeKB = Math.round(fs.statSync(svgPath).size / 1024);
  
  console.log(`✅ Generated animated SVG: ${svgPath}`);
  console.log(`📏 Grid size: ${contributionGrid[0].length} weeks × 7 days`);
  console.log(`⏱️  Animation duration: ${CONFIG.duration}`);
  console.log(`📦 File size: ${fileSizeKB}KB`);
  console.log(`🚀 Ready to embed in README!`);
  
  return svgPath;
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { main, CONFIG };
