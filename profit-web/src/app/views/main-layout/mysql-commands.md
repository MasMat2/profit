ssh -L 3307:127.0.0.1:3307 root@194.238.29.232 -N


mysql -u root -prootpassword -h 127.0.0.1 -P 3307


docker exec -it mysql55_local mysql -u root -prootpassword \
  -e "CREATE DATABASE IF NOT EXISTS bdksiste_bdkgym CHARACTER SET utf8 COLLATE utf8_general_ci;"



docker exec -i mysql55_local mysql -u root -prootpassword bdksiste_bdkgym \
  < /root/mysql51-local/dumps/backup3.sql


pv /root/mysql51-local/dumps/backup3.sql | \
  docker exec -i mysql55_local mysql -u root -prootpassword bdksiste_bdkgym


docker exec -it mysql55_local mysql -u root -prootpassword bdksiste_bdkgym \
  -e "SHOW TABLES;"

  sudo ufw allow from 189.158.220.2 to any port 3307


# Allow your specific IPs
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 187.189.136.62 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 187.189.136.251 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 189.159.0.129 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 189.158.220.2 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 189.218.6.179 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 189.159.6.168 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 187.189.165.62 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 189.203.91.62 -j ACCEPT
sudo iptables -I DOCKER-USER -p tcp --dport 3306 -s 212.227.239.14 -j ACCEPT

# Block everyone else on that port
sudo iptables -A DOCKER-USER -p tcp --dport 3306 -j DROP

# Then persist the rules so they survive reboot:
sudo apt install iptables-persistent -y
sudo netfilter-persistent save

http://194.238.29.232/

http://194.238.29.232/


UPDATE mysql.user SET Password=PASSWORD('Fum4s!Crick0Fu+Maryjuana') WHERE User='root';
FLUSH PRIVILEGES;
EXIT;