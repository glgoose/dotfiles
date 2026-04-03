set scrolloff=8
set number
set relativenumber
set tabstop=4 softtabstop=4
set shiftwidth=4
set expandtab
set smartindent
set wildmode=full
set wildmenu

syntax on
colorscheme desert

let mapleader = " "
nnoremap <leader>ft :Vex<CR>
nnoremap <leader><CR> :so ~/.vimrc<CR>
noremap <C-6> <C-^>
set rtp+=/opt/homebrew/opt/fzf
