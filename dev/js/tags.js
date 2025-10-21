/**
 * Tags Section - Comprehensive tag analysis and management
 * Supports both runtime analysis and API data
 */

let currentTagsData = [];
let currentTagsSource = 'runtime';

/**
 * Initialize Tags Section
 */
function initializeTagsSection() {
    console.log('🏷️ Initializing Tags section...');
    
    // Set default data source to runtime only
    const dataSourceSelect = document.getElementById('tagsDataSource');
    if (dataSourceSelect) {
        dataSourceSelect.value = 'runtime';
        currentTagsSource = 'runtime';
    }
    
    // Load initial data
    loadTagsData();
}

/**
 * Load tags data based on selected source
 */
async function loadTagsData() {
    const dataSource = document.getElementById('tagsDataSource')?.value || 'runtime';
    currentTagsSource = dataSource;
    
    console.log(`📊 Loading tags from ${dataSource}...`);
    
    let tags = [];
    
    // Only load from runtime (API removed)
    tags = await loadTagsFromRuntime();
    
    currentTagsData = tags;
    
    // Update statistics
    updateTagsStatistics(tags);
    
    // Display tags
    displayTags(tags);
    
    // Update data source badge
    updateDataSourceBadge(dataSource);
}

/**
 * Load tags from runtime analysis
 */
async function loadTagsFromRuntime() {
    if (!window.utag || !window.utag.loader || !window.utag.loader.cfg) {
        console.warn('⚠️ Tealium not loaded, cannot get runtime tags');
        return [];
    }
    
    // Use the existing analyzeTags function from profile-inspector.js
    if (typeof analyzeTags === 'function') {
        return await analyzeTags();
    }
    
    // Fallback: basic tag extraction
    const tags = [];
    const loaderCfg = window.utag.loader.cfg;
    
    Object.keys(loaderCfg).forEach(key => {
        if (!isNaN(parseInt(key)) && key.length < 5) {
            const tagCfg = loaderCfg[key];
            tags.push({
                uid: key,
                name: tagCfg.name || tagCfg.title || `Tag ${key}`,
                status: tagCfg.load ? 'Active' : 'Inactive',
                source: 'runtime'
            });
        }
    });
    
    return tags;
}


/**
 * Update tags statistics
 */
function updateTagsStatistics(tags) {
    const total = tags.length;
    const active = tags.filter(t => t.status === 'Active' || t.status === 'OK' || t.status === 'Loaded').length;
    const bundled = tags.filter(t => t.isBundled).length;
    const withLoadRules = tags.filter(t => 
        (t.loadRuleId && t.loadRuleId !== 'Always') || 
        (t.rules && (t.rules.apply || t.rules.exclude))
    ).length;
    
    document.getElementById('tagsStatsTotal').textContent = total;
    document.getElementById('tagsStatsActive').textContent = active;
    document.getElementById('tagsStatsBundled').textContent = bundled;
    document.getElementById('tagsStatsLoadRules').textContent = withLoadRules;
    document.getElementById('tagsCount').textContent = total;
}

/**
 * Display tags list
 */
function displayTags(tags) {
    const container = document.getElementById('tagsListContainer');
    
    if (!container) return;
    
    if (tags.length === 0) {
        container.innerHTML = `
            <div class="text-center py-12 text-gray-500">
                <i class="fas fa-tags text-gray-300 text-4xl mb-4"></i>
                <p>No tags found</p>
                <p class="text-sm mt-2">Load a Tealium profile or connect API to view tags</p>
            </div>
        `;
        return;
    }
    
    const html = `
        <div class="space-y-2">
            ${tags.map(tag => renderTagCard(tag)).join('')}
        </div>
    `;
    
    container.innerHTML = html;
}

/**
 * Render individual tag card
 */
function renderTagCard(tag) {
    const statusColors = {
        'Active': 'bg-green-100 text-green-800',
        'OK': 'bg-green-100 text-green-800',
        'Loaded': 'bg-green-100 text-green-800',
        'Inactive': 'bg-gray-100 text-gray-600',
        'Not Loaded': 'bg-gray-100 text-gray-600',
        'Not Sent': 'bg-yellow-100 text-yellow-800'
    };
    
    const statusColor = statusColors[tag.status] || 'bg-gray-100 text-gray-600';
    
    const sourceIndicator = tag.source === 'api' 
        ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">API</span>'
        : tag.source === 'compare'
        ? `<span class="text-xs ${tag.hasAPI && tag.hasRuntime ? 'bg-purple-100 text-purple-700' : 'bg-orange-100 text-orange-700'} px-2 py-1 rounded ml-2">
            ${tag.hasAPI && tag.hasRuntime ? 'Both' : tag.hasAPI ? 'API Only' : 'Runtime Only'}
           </span>`
        : '<span class="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded ml-2">Runtime</span>';
    
    return `
        <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
            <div class="flex items-start justify-between">
                <div class="flex-1">
                    <div class="flex items-center">
                        <h4 class="text-lg font-medium text-gray-900">${escapeHtml(tag.name)}</h4>
                        ${sourceIndicator}
                        ${tag.isBundled ? '<span class="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded ml-2">Bundled</span>' : ''}
                    </div>
                    
                    <div class="flex items-center space-x-4 mt-2 text-sm text-gray-600">
                        <span>UID: <span class="font-mono">${tag.uid}</span></span>
                        ${tag.templateId ? `<span>Template: <span class="font-mono">${tag.templateId}</span></span>` : ''}
                        ${tag.version ? `<span>Version: ${tag.version}</span>` : ''}
                    </div>
                    
                    ${renderTagDetails(tag)}
                </div>
                
                <div class="flex flex-col items-end space-y-2">
                    <span class="px-3 py-1 ${statusColor} text-xs font-medium rounded-full">
                        ${tag.status}
                    </span>
                    
                    <button onclick="viewTagDetails('${tag.uid}')" class="text-blue-600 hover:text-blue-700 text-sm font-medium">
                        <i class="fas fa-info-circle mr-1"></i>Details
                    </button>
                </div>
            </div>
        </div>
    `;
}

/**
 * Render tag details section
 */
function renderTagDetails(tag) {
    let details = '';
    
    // Data mappings
    if (tag.dataMappings && tag.dataMappings.length > 0) {
        details += `
            <div class="mt-3 p-3 bg-blue-50 rounded">
                <div class="text-sm font-medium text-blue-900 mb-2">Data Mappings:</div>
                <div class="space-y-1">
                    ${tag.dataMappings.map(mapping => `
                        <div class="text-xs text-blue-800">
                            <span class="font-mono">${escapeHtml(mapping.variable || '')}</span>
                            <span class="text-blue-600">(${mapping.type || 'unknown'})</span>
                            ${mapping.mappings ? ` → ${mapping.mappings.join(', ')}` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Load rules
    if (tag.loadRuleDetails && tag.loadRuleDetails.length > 0) {
        details += `
            <div class="mt-3 p-3 bg-orange-50 rounded">
                <div class="text-sm font-medium text-orange-900 mb-2">Load Rules:</div>
                <div class="flex flex-wrap gap-2">
                    ${tag.loadRuleDetails.map(rule => `
                        <span class="px-2 py-1 ${rule.result ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} text-xs font-medium rounded">
                            Rule ${rule.id}: ${rule.result ? 'True' : 'False'}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    } else if (tag.loadRuleId && tag.loadRuleId !== 'Always') {
        details += `
            <div class="mt-3 p-3 bg-orange-50 rounded">
                <div class="text-xs text-orange-800">
                    Load Rule: ${tag.loadRuleId}
                </div>
            </div>
        `;
    }
    
    // Target environments (API data)
    if (tag.selectedTargets) {
        const targets = Object.entries(tag.selectedTargets)
            .filter(([, enabled]) => enabled)
            .map(([env]) => env);
        
        if (targets.length > 0) {
            details += `
                <div class="mt-3 p-3 bg-purple-50 rounded">
                    <div class="text-sm font-medium text-purple-900 mb-2">Target Environments:</div>
                    <div class="flex flex-wrap gap-2">
                        ${targets.map(env => `
                            <span class="px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                                ${env}
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }
    }
    
    return details;
}

/**
 * View tag details in modal
 */
function viewTagDetails(tagUid) {
    const tag = currentTagsData.find(t => t.uid === tagUid || t.uid === String(tagUid));
    
    if (!tag) {
        console.error('Tag not found:', tagUid);
        return;
    }
    
    const modal = document.getElementById('tagDetailsModal');
    const title = document.getElementById('tagDetailsTitle');
    const content = document.getElementById('tagDetailsContent');
    
    if (!modal || !title || !content) return;
    
    // Set title
    title.textContent = `${tag.name} (UID: ${tag.uid})`;
    
    // Build detailed content
    let html = `
        <div class="space-y-6">
            <!-- Basic Information -->
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Basic Information</h4>
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-sm text-gray-600">UID</div>
                        <div class="font-mono text-gray-900">${tag.uid}</div>
                    </div>
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-sm text-gray-600">Status</div>
                        <div class="font-medium text-gray-900">${tag.status}</div>
                    </div>
                    ${tag.templateId ? `
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-sm text-gray-600">Template ID</div>
                        <div class="font-mono text-gray-900">${tag.templateId}</div>
                    </div>
                    ` : ''}
                    ${tag.version ? `
                    <div class="p-3 bg-gray-50 rounded">
                        <div class="text-sm text-gray-600">Version</div>
                        <div class="font-mono text-gray-900">${tag.version}</div>
                    </div>
                    ` : ''}
                </div>
            </div>
    `;
    
    // Configuration (API data)
    if (tag.configuration && Object.keys(tag.configuration).length > 0) {
        html += `
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Configuration</h4>
                <div class="p-4 bg-gray-50 rounded">
                    <pre class="text-sm text-gray-800 overflow-x-auto">${JSON.stringify(tag.configuration, null, 2)}</pre>
                </div>
            </div>
        `;
    }
    
    // Data Mappings (API data)
    if (tag.dataMappings && tag.dataMappings.length > 0) {
        html += `
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Data Mappings</h4>
                <div class="space-y-2">
                    ${tag.dataMappings.map(mapping => `
                        <div class="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                            <div class="font-mono text-sm text-blue-900">${escapeHtml(mapping.variable || '')}</div>
                            <div class="text-xs text-blue-700 mt-1">Type: ${mapping.type || 'unknown'}</div>
                            ${mapping.mappings ? `<div class="text-xs text-blue-700">Maps to: ${mapping.mappings.join(', ')}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Load Rules (API data)
    if (tag.rules && (tag.rules.apply || tag.rules.exclude)) {
        html += `
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Load Rules</h4>
                <div class="p-4 bg-gray-50 rounded">
                    <pre class="text-sm text-gray-800 overflow-x-auto">${JSON.stringify(tag.rules, null, 2)}</pre>
                </div>
            </div>
        `;
    }
    
    // Advanced Configuration (API data)
    if (tag.advancedConfiguration && Object.keys(tag.advancedConfiguration).length > 0) {
        html += `
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Advanced Configuration</h4>
                <div class="grid grid-cols-2 gap-4">
                    ${Object.entries(tag.advancedConfiguration).map(([key, value]) => `
                        <div class="p-3 bg-gray-50 rounded">
                            <div class="text-sm text-gray-600">${key}</div>
                            <div class="font-medium text-gray-900">${value === true ? '✓ Yes' : value === false ? '✗ No' : value}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }
    
    // Notes (API data)
    if (tag.notes) {
        html += `
            <div>
                <h4 class="text-lg font-semibold text-gray-900 mb-3">Notes</h4>
                <div class="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                    <p class="text-sm text-gray-800">${escapeHtml(tag.notes)}</p>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    
    content.innerHTML = html;
    modal.classList.remove('hidden');
}

/**
 * Close tag details modal
 */
function closeTagDetailsModal() {
    const modal = document.getElementById('tagDetailsModal');
    if (modal) {
        modal.classList.add('hidden');
    }
}

/**
 * Apply filters and sorting
 */
function applyTagsFilters() {
    const filterType = document.getElementById('tagsFilterType')?.value || 'all';
    const filterValue = document.getElementById('tagsFilterValue')?.value.toLowerCase() || '';
    const sortType = document.getElementById('tagsSortType')?.value || 'uid';
    const sortDirection = document.getElementById('tagsSortDirection')?.getAttribute('data-direction') || 'asc';
    
    let filtered = [...currentTagsData];
    
    // Apply filter
    if (filterType !== 'all' && filterValue) {
        filtered = filtered.filter(tag => {
            switch (filterType) {
                case 'name':
                    return tag.name.toLowerCase().includes(filterValue);
                case 'uid':
                    return String(tag.uid).includes(filterValue);
                case 'status':
                    return tag.status.toLowerCase().includes(filterValue);
                case 'template':
                    return tag.templateId && String(tag.templateId).includes(filterValue);
                default:
                    return true;
            }
        });
    }
    
    // Apply sorting
    filtered.sort((a, b) => {
        let valueA, valueB;
        
        switch (sortType) {
            case 'uid':
                valueA = parseInt(a.uid) || 0;
                valueB = parseInt(b.uid) || 0;
                break;
            case 'name':
                valueA = a.name.toLowerCase();
                valueB = b.name.toLowerCase();
                break;
            case 'status':
                valueA = a.status;
                valueB = b.status;
                break;
            case 'template':
                valueA = a.templateId || '';
                valueB = b.templateId || '';
                break;
            default:
                valueA = a.uid;
                valueB = b.uid;
        }
        
        if (sortDirection === 'asc') {
            return valueA < valueB ? -1 : valueA > valueB ? 1 : 0;
        } else {
            return valueA > valueB ? -1 : valueA < valueB ? 1 : 0;
        }
    });
    
    displayTags(filtered);
}

/**
 * Toggle sort direction
 */
function toggleTagsSortDirection() {
    const button = document.getElementById('tagsSortDirection');
    if (!button) return;
    
    const currentDirection = button.getAttribute('data-direction');
    const newDirection = currentDirection === 'asc' ? 'desc' : 'asc';
    
    button.setAttribute('data-direction', newDirection);
    button.innerHTML = newDirection === 'asc'
        ? '<i class="fas fa-sort-amount-down-alt mr-2"></i>Ascending'
        : '<i class="fas fa-sort-amount-up mr-2"></i>Descending';
    
    applyTagsFilters();
}

/**
 * Refresh tags data
 */
async function refreshTagsData() {
    window.showNotification('Refreshing tags data...', 'info');
    await loadTagsData();
    window.showNotification('Tags data refreshed', 'success');
}

/**
 * Export tags data as JSON
 */
function exportTagsData() {
    if (currentTagsData.length === 0) {
        window.showNotification('No tags data to export', 'warning');
        return;
    }
    
    const dataStr = JSON.stringify(currentTagsData, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `tealium-tags-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    window.showNotification('Tags data exported successfully', 'success');
}

/**
 * Update data source badge
 */
function updateDataSourceBadge(source) {
    const badge = document.getElementById('tagsDataSourceBadge');
    if (!badge) return;
    
    const labels = {
        'runtime': 'Runtime Analysis',
        'api': 'API Data',
        'compare': 'Comparing Both'
    };
    
    const colors = {
        'runtime': 'bg-gray-100 text-gray-700',
        'api': 'bg-blue-100 text-blue-700',
        'compare': 'bg-purple-100 text-purple-700'
    };
    
    badge.textContent = labels[source] || 'Unknown';
    badge.className = `text-xs font-medium px-3 py-1 rounded-full ${colors[source] || 'bg-gray-100 text-gray-700'}`;
}

/**
 * Escape HTML for safe display
 */
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Close modal when clicking outside
document.addEventListener('click', function(event) {
    const modal = document.getElementById('tagDetailsModal');
    if (event.target === modal) {
        closeTagDetailsModal();
    }
});

// Close modal with Escape key
document.addEventListener('keydown', function(event) {
    if (event.key === 'Escape') {
        closeTagDetailsModal();
    }
});

// Expose functions globally
window.initializeTagsSection = initializeTagsSection;
window.loadTagsData = loadTagsData;
window.viewTagDetails = viewTagDetails;
window.closeTagDetailsModal = closeTagDetailsModal;
window.applyTagsFilters = applyTagsFilters;
window.toggleTagsSortDirection = toggleTagsSortDirection;
window.refreshTagsData = refreshTagsData;
window.exportTagsData = exportTagsData;

console.log('✅ Tags module loaded');

