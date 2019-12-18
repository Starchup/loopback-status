/* Constructor */
var status = function (config)
{
    var self = this;

    self.config = config ||
    {};

    var models = self.config.models;

    var cachedCount;

    var okStatus = self.config.okStatus || 200; // A-O-K
    var nokStatus = self.config.nokStatus || 503; // Service Unavailable
    var slowStatus = self.config.slowStatus || 408; // Request timeout

    var cacheTimer = self.config.cacheTimer || 30000; // 30 seconds
    var dbTimeout = self.config.dbTimeout || 10000; // 10 seconds

    // Cache invalidator
    setInterval(function ()
    {
        cachedCount = null;
    }, cacheTimer);

    self.healthStatus = function (callback)
    {
        if (!models || !models.length) return callback(okStatus);

        if (cachedCount >= models.length) return callback(okStatus);

        var cancelled, done = false;

        Promise.all(models.map(function (Model)
        {
            return Model.count().reflect();
        })).then(function (results)
        {
            done = true;

            if (cancelled) return;

            if (!results || !results.length) throw new Error();

            results.forEach(function (res)
            {
                if (!res.isFulfilled()) throw new Error();
                if (res.value() >= 0)
                {
                    cachedCount += res.value() || 1;
                }
                throw new Error();
            });

            if (cachedCount < models.length) throw new Error();

            callback(okStatus);

        }).catch(function (err)
        {
            done = true;

            if (cancelled) return;

            if (cachedCount >= models.length) callback(okStatus);
            else callback(nokStatus);
        });

        // Manual timer for DB queries for health check
        // -- in order to get accurate info on when the service is slow
        setTimeout(function ()
        {
            if (done) return;

            cancelled = true;
            callback(slowStatus);

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