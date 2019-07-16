'use strict';

module.exports = class Location
{
	constructor( config )
	{
		//this._waiting_callbacks = [];
		this._config = config;
		this._locations = [];
		this._current_location = {};
		this._location_updates = null;
	}

	static _currentTime()
	{
		return Math.floor((new Date()).getTime() / 1000);
	}

	static _deg2rad( deg )
	{
		return deg * (Math.PI/180);
	}

	static _metersDistance( location1, location2 )
	{
		let R = 6371;
		let dLat = Location._deg2rad(location2.latitude-location1.latitude);
		let dLon = Location._deg2rad(location2.longitude-location1.longitude);
		let a = Math.sin(dLat/2) * Math.sin(dLat/2) +
				Math.cos(Location._deg2rad(location1.latitude)) * Math.cos(Location._deg2rad(location2.latitude)) *
				Math.sin(dLon/2) * Math.sin(dLon/2);
		let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
		let d = R * c; // Distance in km
		return d * 1000;
	}

	_removeExpiredLocations()
	{
		if( !this._config || !this._config.expiry ){ return; }

		let expiredLocations = [];

		for( let i = 0; i < this._locations.length; ++i )
		{
			if( Location._currentTime() - (this._config.expiry) >= this._locations[i].time )
			{
				expiredLocations.push(i);
			}
		}

		for( let j = expiredLocations.length - 1; j >= 0; --j )
		{
			this._locations.splice(expiredLocations[j], 1);
		}

		return ( expiredLocations.length > 0 );
	}

	hasLocation()
	{
		this._removeExpiredLocations();

		return ( this._locations.length > 0 );
	}

	get()
	{
		this._removeExpiredLocations();

		if( this._locations.length > 0 )
		{
			let start = 0;
			let sum = 0;
			let latitude = 0;
			let longitude = 0;
			let radius = 0;

			for( let j = this._locations.length - 1; j >= 0; --j )
			{
				if( start == 0 ){ start = this._locations[j].time; }

				let coef = 1 / Math.pow(2, ( start - this._locations[j].time ) / 5);

				sum += coef;
				latitude    += this._locations[j].latitude * coef;
				longitude   += this._locations[j].longitude * coef;
				radius      += this._locations[j].radius * coef;
			}

			return { latitude: latitude/sum, longitude: longitude/sum, radius: Math.round(radius)/sum };
		}
		/*else
		{
			return new Promise( ( resolve ) =>
			{
				this._waiting_callbacks.push(resolve);
			});
		}*/

		return null;
	}

	update( location )
	{
		location = { latitude: location.coords.latitude, longitude: location.coords.longitude, radius: location.coords.accuracy };

		let changes = this._removeExpiredLocations();
		let significant_location_change = 10;

		location.time = Location._currentTime();

		if( this._locations.length == 0 )
		{
			changes = true;

			this._locations.push(location);
		}
		else
		{
			let lastLocation = this._locations[this._locations.length-1];

			if( location.radius <= lastLocation.radius * Math.ceil((Location._currentTime() - lastLocation.time + 1) / 60) + significant_location_change )
			{
				let distance = Location._metersDistance(location, lastLocation);

				if( lastLocation.radius > location.radius + significant_location_change && distance <= 2 * (lastLocation.radius - location.radius) )
				{
					changes = true;

					this._locations = [];
					this._locations.push(location);
				}
				else if( Location._currentTime() - 5 >= lastLocation.time )
				{
					changes = true;

					let significant_accuracy = true;

					for( let i = Math.max(0, this._locations.length-3); i < this._locations.length; ++i )
					{
						if( this._locations[i].radius + significant_location_change < location.radius )
						{
							significant_accuracy = false; break;
						}
					}

					if( significant_accuracy )
					{
						this._locations.push(location);

						let unidirectional_movement = true;

						if( this._locations.length >= 4 )
						{
							for( let i = this._locations.length-4; unidirectional_movement && i < this._locations.length; ++i )
							{
								let locationsDistance = 99999999999;

								for( let j = i + 1; j < this._locations.length; ++j )
								{
									let R = 6371, dLat = (this._locations[i].latitude-this._locations[j].latitude) * (Math.PI/180), dLng = (this._locations[i].longitude-this._locations[j].longitude) * (Math.PI/180);
									let a = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos( this._locations[i].latitude * (Math.PI/180) ) * Math.cos( this._locations[j].latitude * (Math.PI/180) ) * Math.sin(dLng/2) * Math.sin(dLng/2);
									let c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
									let distance = R * c * 1000;

									if( locationsDistance + 1 <= distance )
									{
										unidirectional_movement = false; break;
									}
									else{ locationsDistance = distance; }
								}
							}

							if( unidirectional_movement )
							{
								this._locations = [];
								this._locations.push(location);
							}
						}
					}
					else
					{
						this._locations.push(location);
					}
				}
				else if( distance >= significant_location_change && location.radius <= lastLocation.radius + significant_location_change )
				{
					changes = true;

					this._locations[this._locations.length-1] = location;
				}
			}
		}

		let best_location = this.get();

		if( best_location && best_location.latitude && ( this._current_location.radius != best_location.radius || this._current_location.latitude != best_location.latitude || this._current_location.longitude != best_location.longitude ) )
		{
			this._current_location = best_location;
			let new_location = JSON.parse(JSON.stringify(best_location));
			return new_location;
		}

		return null;
	}
};
