FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
<<<<<<< Updated upstream
COPY *.html /usr/share/nginx/html/
=======
COPY index.html /usr/share/nginx/html/
COPY game.html /usr/share/nginx/html/
COPY admin.html /usr/share/nginx/html/
COPY survey.html /usr/share/nginx/html/
COPY register.html /usr/share/nginx/html/
>>>>>>> Stashed changes
COPY css/ /usr/share/nginx/html/css/
COPY js/ /usr/share/nginx/html/js/
COPY assets/ /usr/share/nginx/html/assets/

EXPOSE 80
