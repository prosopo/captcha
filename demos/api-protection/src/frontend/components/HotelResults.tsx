// Copyright 2021-2025 Prosopo (UK) Ltd.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import React from 'react';
import type { Hotel } from '../types';

interface HotelResultsProps {
  hotels: Hotel[];
}

export const HotelResults: React.FC<HotelResultsProps> = ({ hotels }) => {
  if (hotels.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
          />
        </svg>
        <h3 className="mt-4 text-lg font-medium text-gray-900">No hotels found</h3>
        <p className="mt-2 text-gray-500">
          Try adjusting your search criteria or choose a different destination.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          {hotels.length} hotels found
        </h2>
        <div className="flex items-center space-x-4">
          <select className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="recommended">Recommended</option>
            <option value="price-low">Price: Low to High</option>
            <option value="price-high">Price: High to Low</option>
            <option value="rating">Guest Rating</option>
            <option value="distance">Distance</option>
          </select>
        </div>
      </div>

      <div className="grid gap-6">
        {hotels.map((hotel) => (
          <div
            key={hotel.id}
            className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden"
          >
            <div className="md:flex">
              {/* Hotel Image */}
              <div className="md:flex-shrink-0">
                <img
                  className="h-48 w-full md:h-full md:w-48 object-cover"
                  src={hotel.image}
                  alt={hotel.name}
                  loading="lazy"
                />
              </div>

              {/* Hotel Details */}
              <div className="flex-1 p-6">
                <div className="flex flex-col md:flex-row md:items-start justify-between h-full">
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-1">
                          {hotel.name}
                        </h3>
                        <div className="flex items-center space-x-2">
                          <div className="flex items-center">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`h-4 w-4 ${
                                  i < hotel.rating 
                                    ? 'text-yellow-400 fill-current' 
                                    : 'text-gray-300'
                                }`}
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="text-sm text-gray-600">
                            ({hotel.reviewCount} reviews)
                          </span>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-3 line-clamp-2">
                      {hotel.description}
                    </p>

                    <div className="flex items-center text-sm text-gray-600 mb-3">
                      <svg className="h-4 w-4 mr-1" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
                          clipRule="evenodd"
                        />
                      </svg>
                      {hotel.location.address}, {hotel.location.city}
                    </div>

                    {/* Amenities */}
                    <div className="flex flex-wrap gap-2 mb-4">
                      {hotel.amenities.slice(0, 4).map((amenity) => (
                        <span
                          key={amenity}
                          className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
                        >
                          {amenity}
                        </span>
                      ))}
                      {hotel.amenities.length > 4 && (
                        <span className="text-xs text-gray-500">
                          +{hotel.amenities.length - 4} more
                        </span>
                      )}
                    </div>

                    <div className="flex items-center text-sm">
                      <span className="text-green-600 font-medium">
                        {hotel.cancellationPolicy}
                      </span>
                    </div>
                  </div>

                  {/* Price and Booking */}
                  <div className="mt-4 md:mt-0 md:ml-6 text-right">
                    <div className="mb-2">
                      <span className="text-2xl font-bold text-gray-900">
                        {hotel.currency}{hotel.price}
                      </span>
                      <span className="text-sm text-gray-600"> /night</span>
                    </div>

                    <div className="text-xs text-gray-500 mb-3">
                      Includes taxes and fees
                    </div>

                    {hotel.availability ? (
                      <button className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                        View Deal
                      </button>
                    ) : (
                      <button
                        disabled
                        className="w-full md:w-auto bg-gray-300 text-gray-500 px-6 py-2 rounded-lg cursor-not-allowed font-medium"
                      >
                        Sold Out
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Load More Button */}
      <div className="text-center pt-8">
        <button className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-8 py-3 rounded-lg transition-colors font-medium">
          Load More Hotels
        </button>
      </div>
    </div>
  );
};
