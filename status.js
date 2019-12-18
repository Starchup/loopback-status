/* Constructor */
var status = function (config)
{
    var self = this;

    self.config = config ||
    {};

    self.models = self.config.models;

    self.cachedCount;

    self.okStatus = self.config.okStatus || 200; // A-O-K
    self.nokStatus = self.config.nokStatus || 503; // Service Unavailable
    self.slowStatus = self.config.slowStatus || 408; // Request timeout

    self.cacheTimer = self.config.cacheTimer || 30000; // 30 seconds
    self.dbTimeout = self.config.dbTimeout || 10000; // 10 seconds

    // Cache invalidator
    setInterval(function ()
    {
        self.cachedCount = null;
    }, self.cacheTimer);

    self.healthStatus = function (callback)
    {
        if (!self.models || !self.models.length) return callback(okStatus);

        if (self.cachedCount >= self.models.length) return callback(self.okStatus);

        var cancelled, done = false;

        Promise.all(self.models.map(function (Model)
        {
            return Model.count().reflect();
        })).then(function (results)
        {
            done = true;

            if (cancelled) return;

            if (!results || !results.length) throw new Error();

            self.cachedCount = null;
            results.forEach(function (res)
            {
                if (!res.isFulfilled()) throw new Error();
                if (res.value() >= 0)
                {
                    if (!self.cachedCount) self.cachedCount = 0;
                    self.cachedCount += res.value() || 1;
                }
                throw new Error();
            });

            if (self.cachedCount < self.models.length) throw new Error();

            callback(self.okStatus);

        }).catch(function (err)
        {
            done = true;

            if (cancelled) return;

            if (self.cachedCount >= self.models.length) callback(self.okStatus);
            else callback(self.nokStatus);
        });

        // Manual timer for DB queries for health check
        // -- in order to get accurate info on when the service is slow
        setTimeout(function ()
        {
            if (done) return;

            cancelled = true;
            callback(self.slowStatus);

        }, self.dbTimeout);
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