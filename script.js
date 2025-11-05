document.addEventListener('DOMContentLoaded', () => {
    const inputSite = document.getElementById('inputSite');
    const inputPCI = document.getElementById('inputPCI');
    const searchForm = document.getElementById('searchForm');
    const siteError = document.getElementById('siteError');
    const pciError = document.getElementById('pciError');
    const resultsContainer = document.getElementById('resultsContainer');
    const dataTableBody = document.querySelector('#dataTable tbody');
    const noResultsMessage = document.getElementById('noResults');
    const autocompleteList = document.getElementById('autocompleteList');

    let allData = [];
    let siteColumnValues = new Set(); 

    // Função para carregar e processar o CSV
    async function loadCSV() {
        try {
            const response = await fetch('dataBase.csv');
            if (!response.ok) {
                throw new Error('Erro ao carregar o arquivo dataBase.csv');
            }
            const text = await response.text();
            
            const lines = text.trim().split('\n');
            const dataLines = lines.slice(1); 
            
            allData = dataLines.map(line => {
                const [siteRaw, pci, setor, rede] = line.split(';');
                
                const cleanedSite = siteRaw ? siteRaw.trim().toUpperCase().slice(0, 7).replace(/[^A-Z0-9]/g, '') : '';
                
                if (cleanedSite && cleanedSite.length === 7) {
                    siteColumnValues.add(cleanedSite);
                }

                return {
                    site: cleanedSite,
                    pci: pci ? pci.trim() : '',
                    setor: setor ? setor.trim() : '',
                    rede: rede ? rede.trim().toUpperCase() : ''
                };
            }).filter(item => item.site.length === 7); 
            
            console.log(`CSV carregado. Total de ${allData.length} registros válidos.`);

        } catch (error) {
            console.error('Falha ao carregar ou processar o CSV:', error);
            alert('Não foi possível carregar os dados. Verifique o arquivo dataBase.csv e o delimitador (deve ser ;).');
        }
    }

    // *** FUNÇÃO DE LIMPEZA AJUSTADA: Não zera mais as mensagens de erro ***
    function resetForm() {
        inputSite.value = '';
        inputPCI.value = '';
        inputSite.disabled = false; 
        inputPCI.disabled = false;  
        autocompleteList.innerHTML = '';
        
        // As mensagens de erro (siteError.textContent, pciError.textContent) 
        // são limpas no início do submit, ou após a validação bem sucedida.
        // Se a validação falhar, queremos que elas permaneçam visíveis antes do foco.
        inputSite.focus();
    }
    
    // Função auxiliar para limpar *apenas* as mensagens de erro
    function clearErrors() {
        siteError.textContent = '';
        pciError.textContent = '';
    }

    // --- Lógica de Validação e Formatação (event listeners) ---

    inputSite.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        e.target.value = value;
        
        // Limpa erros APENAS do campo atual ao digitar
        siteError.textContent = ''; 

        if (value.length > 0) {
            inputPCI.disabled = true;
            inputPCI.value = '';
            pciError.textContent = '';
        } else {
            inputPCI.disabled = false;
        }
        
        if (value.length >= 6) {
            showAutocomplete(value);
        } else {
            autocompleteList.innerHTML = ''; 
        }
    });

    inputPCI.addEventListener('input', (e) => {
        let value = e.target.value;
        value = value.replace(/[^0-9]/g, '');
        e.target.value = value;

        // Limpa erros APENAS do campo atual ao digitar
        pciError.textContent = ''; 

        if (value.length > 0) {
            inputSite.disabled = true;
            inputSite.value = '';
            siteError.textContent = '';
            autocompleteList.innerHTML = '';
        } else {
            inputSite.disabled = false;
        }
    });

    // --- Lógica de Autocomplete (sem alterações) ---
    function showAutocomplete(text) {
        if (text.length < 6) return;

        autocompleteList.innerHTML = '';
        
        let matchingSites = Array.from(siteColumnValues).filter(site => 
            site.startsWith(text)
        );
        
        matchingSites.sort();

        if (matchingSites.length > 0) {
            matchingSites.forEach(site => {
                const item = document.createElement('div');
                item.textContent = site;
                item.addEventListener('click', () => {
                    inputSite.value = site;
                    autocompleteList.innerHTML = '';
                    clearErrors(); // Limpa erros ao selecionar autocomplete
                    inputPCI.disabled = true;
                    inputPCI.value = '';
                    searchForm.focus(); 
                });
                autocompleteList.appendChild(item);
            });
        }
    }
    
    document.addEventListener('click', (e) => {
        if (!autocompleteList.contains(e.target) && e.target !== inputSite) {
            autocompleteList.innerHTML = '';
        }
    });

    // --- Lógica de Pesquisa (COM EXIBIÇÃO DE ERROS E LIMPEZA CORRIGIDAS) ---
    searchForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // 1. Limpa resultados anteriores e erros no início
        dataTableBody.innerHTML = '';
        resultsContainer.classList.add('hidden');
        noResultsMessage.classList.add('hidden');
        clearErrors();

        const siteValue = inputSite.value.trim();
        const pciValue = inputPCI.value.trim();
        
        const isSiteFilled = siteValue.length > 0;
        const isPciFilled = pciValue.length > 0;
        
        let validationFailed = false;

        // Validação 1: Exclusividade
        if (!isSiteFilled && !isPciFilled) {
             siteError.textContent = 'Preencha o campo Site ou o campo PCI para pesquisar.';
             pciError.textContent = 'Preencha o campo Site ou o campo PCI para pesquisar.';
             validationFailed = true;
        }
        
        // Validação 2: Formato e Existência (Site)
        if (!validationFailed && isSiteFilled) {
            if (siteValue.length !== 7 || !/^[A-Z0-9]{7}$/.test(siteValue)) {
                siteError.textContent = 'O campo Site deve ter exatamente 7 caracteres (letras e números).';
                validationFailed = true;
            }
            if (!validationFailed && !siteColumnValues.has(siteValue)) {
                siteError.textContent = `O Site "${siteValue}" não existe na base de dados.`;
                validationFailed = true;
            }
        } 
        
        // Validação 2: Formato e Existência (PCI)
        else if (!validationFailed && isPciFilled) {
            if (pciValue.length === 0 || pciValue.length > 3 || !/^[0-9]+$/.test(pciValue)) {
                 pciError.textContent = 'O campo PCI deve ter de 1 a 3 dígitos numéricos.';
                 validationFailed = true;
            }
            if (!validationFailed && !allData.some(item => item.pci === pciValue)) {
                pciError.textContent = `O PCI "${pciValue}" não existe na base de dados.`;
                validationFailed = true;
            }
        }
        
        // *** CORREÇÃO AQUI: Se falhar, RETORNA e DEIXA AS MENSAGENS VISÍVEIS ***
        if (validationFailed) {
            // Não chama resetForm() para não limpar os campos e as mensagens de erro.
            return;
        }
        
        // Se a validação passou, limpamos os erros antes da pesquisa e seguimos para o filtro
        clearErrors();

        // 3. Filtragem
        let filteredData = [];
        if (isSiteFilled) {
            filteredData = allData.filter(item => item.site === siteValue);
        } else if (isPciFilled) {
            filteredData = allData.filter(item => item.pci === pciValue);
        }

        // 4. Exibe os Resultados
        if (filteredData.length > 0) {
            renderTable(filteredData);
            resultsContainer.classList.remove('hidden');
        } else {
            resultsContainer.classList.remove('hidden');
            noResultsMessage.classList.remove('hidden');
        }

        // *** LIMPEZA GARANTIDA APÓS PESQUISA BEM SUCEDIDA/SEM RESULTADOS ***
        resetForm(); 
    });

    // --- Lógica de Renderização da Tabela (sem alterações) ---
    function renderTable(data) {
        data.forEach(item => {
            const row = dataTableBody.insertRow();
            
            if (item.rede.includes('5G')) {
                row.classList.add('row-5g');
            }

            row.insertCell().textContent = item.site;
            row.insertCell().textContent = item.pci;
            row.insertCell().textContent = item.setor;
            row.insertCell().textContent = item.rede;
        });
    }

    loadCSV();
});
