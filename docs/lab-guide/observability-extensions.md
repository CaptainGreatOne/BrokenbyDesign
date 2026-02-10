## Using Extensions in Grafana

When writing and designing the lab, I realized that there was literally no existing way to view and visualize the redis deployment whatsoever. As this lab has a focus on observability, I decided to add redis to grafana. This task is actually quite simple. Redis is not automatically available from a stock Grafana deployment, and will need to be installed as a plugin

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