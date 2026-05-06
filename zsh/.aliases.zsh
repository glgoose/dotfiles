alias mmv='noglob zmv -W'
alias dka='docker container rm --force $(docker ps --all --quiet)'
alias glg="git log --abbrev-commit --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%a    n>%Creset'"
alias glgg="git log --abbrev-commit --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold     blue)<%an>%Creset'"
#alias m4bt='docker run -it --rm -u $(id -u):$(id -g) -v "$(pwd)":/mnt sandreas/m4b-tool:latest'
alias heicjpg="mogrify -format jpg *.(HEIC|heic) && rm *.(HEIC|heic)"
alias pptpdf="soffice --headless --convert-to pdf *.pptx"
alias ocr="ocrmypdf -l eng --redo-ocr --oversample 300 --output-type pdf"
alias clauded="claude --dangerously-skip-permissions"
alias ytmp4='yt-dlp -f "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4'
alias ytmp4-playlist='yt-dlp -f "bv[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" --merge-output-format mp4 --replace-in-metadata "title" "\s+[｜|].*" "" --replace-in-metadata "title" "？" "?" -o "%(playlist_index)02d - %(title)s.%(ext)s"'
