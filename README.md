# loopback-status
Health check helper for loopback datasources.

### Description

1. Verify that data is accessible by doing Count queries to the passed in models
2. Cache the response of those counts for a predefined amount of time.
3. Make sure the Count queries execute under a predefined amount of time

### Initialization

```
var status = require('loopback-status');
var Status = new status(
{
    models: [app.models.YouModel],
    okStatus: 200,      // Response code to return when all is well
    nokStatus: 503,     // Response code to return when any DB requests fail
    slowStatus: 408,    // Response code to return when DB response takes too long
    cacheTimer: 30000,  // How long to preserve cached result for
    dbTimeout: 10000    // how long to wait before DB results come back
});
```


### Basic use

In the boot directory of your loopback app add a new file:
```
var status = require('loopback-status');

// Install a `/` route that returns server status
module.exports = function (app)
{
    var Status = new status(
    {
        models: [app.models.YourModel1, app.models.YourModel2]
    });

    var router = app.loopback.Router();
    router.get('/', Status.health);
    app.use(router);
};
```
