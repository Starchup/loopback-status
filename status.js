/* Constructor */
var status = function (config)
{
    var self = this;

    self.config = config ||
    {};

    self.healthStatus = function (callback)
    {
        var cachedCount;
        var offlineCount = 0;

        var models = self.config.models;

        var okStatus = self.config.okStatus || 200; // A-O-K
        var nokStatus = self.config.nokStatus || 503; // Service Unavailable
        var slowStatus = self.config.slowStatus || 408; // Request timeout

        var cacheTimer = self.config.cacheTimer || 30000; // 30 seconds
        var dbTimeout = self.config.dbTimeout || 10000; // 10 seconds

        if (!models || !models.length) return callback(okStatus);

        // Cache invalidator
        setInterval(function ()
        {
            cachedCount = null;
        }, cacheTimer);

        if (cachedCount > offlineCount) return callback(okStatus);
        if (cachedCount === offlineCount) return callback(nokStatus);

        var cancelled, done = false;

        Promise.all(models.map(function (Model)
        {
            return Model.count().reflect();
        })).then(function (results)
        {
            if (cancelled) return;
            if (!results || !results.length) throw new Error();

            done = true;

            results.forEach(function (res)
            {
                if (!res.isFulfilled()) throw new Error();
                if (res.value() < 1) throw new Error();
                if (!cachedCount) cachedCount = 0;
                cachedCount += res.value();
            });

            if (cachedCount < models.length) throw new Error();

            return okStatus;

        }).catch(function (err)
        {
            if (cancelled) return;
            done = true;

            cachedCount = offlineCount;
            return nokStatus;
        }).then(function (status)
        {
            if (status) callback(status);
        });

        // Manual timer for DB queries for health check
        // -- in order to get accurate info on when the service is slow
        setTimeout(function ()
        {
            if (!done)
            {
                cancelled = true;
                callback(slowStatus);
            }
        }, dbTimeout);
    };

    self.health = function (req, res)
    {
        self.healthStatus(function (status)
        {
            res.sendStatus(status);
        });
    };
}
module.exports = status;