### Manifest format

The first thing to define for your add-on is the manifest, which describes it's name, purpose and some technical details.

Valid properties are:

``id`` - **required** - identifier, dot-separated, e.g. "com.stremio.filmon"

``name`` - **required** - human readable name

``description`` - **required** - human readable description

``idProperty`` - **required** - ID property of the Meta or Streams that this add-on delivers - for example ``imdb_id`` or ``filmon_id``; can be string or array of strings

``types`` - **required** - array of supported types, from all the [``Content Types``](/meta/content.types.md)

**IMPORTANT** - ``types`` and ``idProperty`` will be used when Stremio selects add-ons to call for a certain request. For example, if the user wants to watch Metropolis, the query would be ``{ type: "movie", imdb_id: "tt0017136" }``, your add-on has to have ``imdb_id`` in the manifest ``idProperty`` and ``movie`` in the manifest ``types``.

``webDescription`` - _optional_ - human readable description for the auto-generated add-on HTML page ; HTML allowed

``endpoint`` - _optional_ - http endpoint to the hosted version of this add-on; should end in standard stremio URL path, such as ``/stremio/v1`` for the v1 version of the protocol; example: ``http://cinemeta.strem.io/stremioget/stremio/v1``

``background`` - _optional_ - background image for the add-on; URL to png/jpg, at least 1024x786 resolution

``logo`` - _optional_ - logo icon, URL to png, monochrome, 256x256

``isFree`` - _optional_ - set this to ``true`` if you want to specify that all of the content in this add-on is free of charge; this is used when auto-generating a landing page for that add-on

``contactEmail`` - **required** - contact email for add-on issues; used for the Report button in the app; also, the Stremio team may reach you on this email for anything relating your add-on

``suggested`` - _optional_ - array of IDs of other add-ons that should be suggested when installing this add-on

``sorts`` - _optional_ - additional types of sorting in catalogues; array of sort objects

```javascript
[
  { prop: "popularities.moviedb", name: "SORT_TRENDING", types: ["movie", "series"], noDiscoverTab: false, countrySpecific: false }
  // noDiscoverTab would hide this sort from Discover
  // countrySpecific would force Stremio to send country code with the meta.find request for that sort
]
```

***TIP* - use different sorts to provide different catalogues for your users, e.g. separate "popular movies" and "new movies". This will appear as a tab in Discover and as a row in Board**

``searchDebounce`` - _optional_ - how much to de-bounce after the user types before calling ``meta.search``

``countrySpecific`` - _optional_ - boolean - if true, the stremio client must pass ``countryCode`` of the user along with ``meta.find``. *Example*: add-on for service where the streams are georestricted, e.g. Netflix; you can use this either directly in ``manifest``, or under one or more of the ``sorts``

``zipSpecific`` - _optional_ - boolean - if true, the stremio client must pass ``zip`` code of the user along with  ``meta.find``. *Example*: cinema showtimes guide add-on where result is specific to city

***TIP* - to implement sources where streams are geo-restricted (stream.find), see [``Stream object's``](/stream/stream.response.md) `geos`**