for file in ./*
do
  ffmpeg -i "$file" -vf scale=320:240 out/"$file" 
done