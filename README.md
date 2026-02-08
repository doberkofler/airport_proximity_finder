# ✈️ Airport Proximity Finder

Find commercial airports within a specified radius of any location worldwide.

## Features

- **Location Search**: Fuzzy location search with autocomplete suggestions
- **Flexible Range**: Adjustable search radius from 10-500 km
- **Distance Modes**:
  - **Straight-line**: Direct distance using Haversine formula
  - **Driving**: Actual driving distance via road network
- **Commercial Airports Only**: Filters for medium and large airports with IATA codes
- **Clean UI**: Modern, responsive design with subtle aesthetics

## Live Demo

Visit: `https://YOUR_USERNAME.github.io/airport-finder/`

## Technologies

- **Geocoding**: [Nominatim](https://nominatim.openstreetmap.org/) (OpenStreetMap)
- **Airport Data**: [OurAirports](https://ourairports.com/data/)
- **Routing**: [OSRM](http://project-osrm.org/) (Open Source Routing Machine)
- **Frontend**: Vanilla JavaScript, CSS, HTML

## Local Development

1. Clone the repository:
   ```bash
   git clone https://github.com/YOUR_USERNAME/airport-finder.git
   cd airport-finder
   ```

2. Serve locally:
   ```bash
   python3 -m http.server 8000
   # or
   npx serve
   ```

3. Open `http://localhost:8000`

## Deployment to GitHub Pages

1. Create a new repository on GitHub

2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin git@github.com:YOUR_USERNAME/airport-finder.git
   git push -u origin main
   ```

3. Enable GitHub Pages:
   - Go to repository Settings → Pages
   - Source: Deploy from branch
   - Branch: main, root folder
   - Save

4. Site will be live at `https://YOUR_USERNAME.github.io/airport-finder/`

## Project Structure

```
airport-finder/
├── index.html           # Main HTML file
├── airport-finder.css   # Styles
├── airport-finder.js    # Application logic
└── README.md           # Documentation
```

## API Usage

### Free APIs (No API Key Required)

- **Nominatim**: Geocoding, 1 request/second limit
- **OurAirports**: Airport database, static CSV
- **OSRM**: Routing, rate-limited

### Notes on Driving Distance

- Limited to 20 nearest airports to avoid excessive API calls
- 100ms delay between requests to respect rate limits
- Falls back to straight-line distance on API failures

## Browser Support

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## License

MIT

## Credits

- Airport data from [OurAirports](https://ourairports.com/)
- Geocoding by [OpenStreetMap Nominatim](https://nominatim.openstreetmap.org/)
- Routing by [OSRM](http://project-osrm.org/)
