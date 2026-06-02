# DGL Tour Website Starter

This is a React/Vite starter site for the Dojo Golf League.

## What is included
- Homepage with live standings priority
- Event schedule
- Player pages/preview cards
- Red Room / Red Rounds Hall of Fame
- Side Pots card: Eagle, Hole-in-One, Sandy
- Sportsbook odds placeholder
- State Trophy tracker starter
- DGL logo styling

## Current data source
`data/dgl-data.json` was generated from the Excel export you uploaded.

For launch, connect this to Google Sheets so weekly updates flow directly from the sheet.

## Side pots logic
The site should pull the furthest-right numeric value from the current year tab by row label:
- Eagle
- Hole in One
- Sandy

Historical note locked in:
Scott Wishart won the 2025 Eagle Pot — $117.50.

## Suggested deploy
1. Install Node.js
2. Run `npm install`
3. Run `npm run dev`
4. Deploy to Vercel or Netlify

## Next development step
Replace `data/dgl-data.json` with a live Google Sheets fetch using the Google Visualization CSV endpoint or Google Sheets API.
