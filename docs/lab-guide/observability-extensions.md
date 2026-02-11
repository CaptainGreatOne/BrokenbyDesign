# Using Extensions in Grafana

When writing and designing the lab, I realized that there was literally no existing way to view and visualize the redis deployment whatsoever. As this lab has a focus on observability, I decided to add redis to grafana. This task is actually quite simple. Redis is not automatically available from a stock Grafana deployment, and will need to be installed as a plugin


## Redis 

### Plugins via Docker

If you wish the plugin to be installed automatically, open the docker compose file, `docker-compose.yml` located in the root project directory. Add the following line to the 'grafana.environment' variables: 

` - GF_INSTALL_PLUGINS=redis-datasource`

Then, either start or restart the container. 

### Plugins via a running Grafana Application. 

Once the Grafana container has been launched and logged into, plugins can be installed. On the left hand menu, navigate to 'Administration > Plugins and Data > Plugins'. From there, search, select, and install a plugin named 'Redis Application'. 
After installation, return to the left hand menu and select 'Connections > Add New Connection'. Search for 'redis-datasource' as a datasource, and select it. Finally, set up the connection. For the sake of this lab, the redis instance is not secure or complicated. Simply add the redis URL in the 'Address' field. To find the redis address for this project, look in the `.env` folder in the root project directory. The redis URL is `redis://redis:6379
`. Copy and paste, then select the 'save and test' button at the bottom of the screen. A positive green message should appear shortly afterwards. 

### Post Redis Datasource Setup
Redis as a datasource is now complete. Navigate to the Dashboards page via the left hand menu. Upon the addition of the Redis datasource into Grafana, 3 new dashboards have been automatically created: 
- Redis CLI
- Redis Overview
- RedisGears

These dashboards are viewable. I encourage you to open and read each one. 


### Ideas for Additional Redis Dashboards
This lab has been created with the intent to provide a sandbox so software developers may learn observability. So, let's dive into observation. When looking at the redis instance, and other applications for that matter, there are a few questions to ask which can guide in the creation of developing a dashboard: 
- Is Redis Healthy?
- What data is in Redis? 
- Is the Data Persistant? 
- What data Structures are being used? 
- What does the real time activity look like? 
- Which servers utilize Redis the most vs the least? 


## Postgres

A postgres database is running within the lab. Lucky for us, it can be added as a datasource in Grafana. Navigate to Grafana, select the `Connections > Add New Datasource' from the left hand menu. When the page loads, search for 'postgres'. This should be preinstalled on your Grafana instance. 
When setting up the postgres database, there are a few items to keep in mind. One, database name can be found in the .env file in the root project directory. 
Second, and more importantly, the following URL will provide additional information on setting up the postgres datasource: https://grafana.com/docs/grafana/latest/datasources/postgres/configure/.  

Please make note that there is a sectrion on that webpage that describes creating a whole user in the database just for grafana, which eliminates the risk of grafana dropping database tables in production. OR, ignore this warning and just test in prod and live dangerously.

When I was setting up this project, I had issues simply getting the datasource to connect. The url field appears to want to accept a standard address, such as `localhost:5432`. This will cause problems