# Location weighted average
Do you need location weighted average? You can use my library.

### Installing
```
npm install location-weighted-average --save
- or -
yarn add location-weighted-average
```

### Usage
```
const Location = new (require('location-weighted-average'))({ expiry: 60*5/*time in seconds*/ });

Location.update( { coords: { latitude: 10, longitude: 10, accuracy: 10 } } );

const avg_location = Location.get(); //returns { latitude, longitude, radius } or null
```
### API

#### config
Object to constructor. You can define expiry to added locations.
#### update()
Add location to lib.
#### get()
Get the average location.