#!/bin/bash
set -e

echo "Limpando node_modules e package-lock..."
rm -rf node_modules package-lock.json

echo "Instalando dependências com --force..."
npm install --force

echo "Instalação completa!"
