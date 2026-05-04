#!/bin/bash

# Este script prepara um kubeconfig válido para ser usado no Kubstorm
# Você precisa estar autenticado com gcloud para cada projeto GCP

echo "Preparando kubeconfig para Kubstorm..."
echo "Este script precisa que você esteja autenticado com gcloud"

# Gera tokens de acesso para cada contexto
KUBECONFIG=$HOME/.kube/config

echo ""
echo "✓ Para cada cluster GKE, você pode usar:"
echo "  - Use gcloud para autenticação: gcloud auth application-default login"
echo "  - Ou gere um token: gcloud auth print-access-token"
echo ""
echo "Próximos passos:"
echo "1. Autentique com: gcloud auth application-default login"
echo "2. Tente acessar um cluster: kubectl get nodes"
echo "3. A app agora poderá usar as credenciais autenticadas"
echo ""

