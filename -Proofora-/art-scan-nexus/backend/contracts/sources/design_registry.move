module proofora::design_registry {
    use std::string::String;
    use std::signer;
    use std::vector;   
    use aptos_framework::timestamp;

    // Simple structure to store design info
    struct DesignRecord has store, key {
        design_hash: String,      // Image fingerprint (SHA-256)
        owner: address,           // Your wallet address
        timestamp: u64,           // When it was uploaded
        title: String             // Design title
    }

    // Store all designs in a list
    struct DesignRegistry has key {
        designs: vector<DesignRecord>
    }

    // Initialize the registry (run once)
    public entry fun initialize(account: &signer) {
        let account_addr = signer::address_of(account);
        
        if (!exists<DesignRegistry>(account_addr)) {
            move_to(account, DesignRegistry {
                designs: vector::empty<DesignRecord>()
            });
        };
    }

    // Register a new design
    public entry fun register_design(
        account: &signer,
        design_hash: String,
        title: String
    ) acquires DesignRegistry {
        let account_addr = signer::address_of(account);
        
        // Initialize if not exists
        if (!exists<DesignRegistry>(account_addr)) {
            initialize(account);
        };

        // Get current time
        let now = timestamp::now_seconds();

        // Create new design record
        let design = DesignRecord {
            design_hash,
            owner: account_addr,
            timestamp: now,
            title
        };

        // Add to registry
        let registry = borrow_global_mut<DesignRegistry>(account_addr);
        vector::push_back(&mut registry.designs, design);
    }

    // Check if a design hash exists (for plagiarism detection)
    #[view]
    public fun design_exists(owner: address, design_hash: String): bool acquires DesignRegistry {
        if (!exists<DesignRegistry>(owner)) {
            return false
        };

        let registry = borrow_global<DesignRegistry>(owner);
        let len = vector::length(&registry.designs);
        let i = 0;

        while (i < len) {
            let design = vector::borrow(&registry.designs, i);
            if (design.design_hash == design_hash) {
                return true
            };
            i = i + 1;
        };

        false
    }

    // Get total number of designs
    #[view]
    public fun get_design_count(owner: address): u64 acquires DesignRegistry {
        if (!exists<DesignRegistry>(owner)) {
            return 0
        };

        let registry = borrow_global<DesignRegistry>(owner);
        vector::length(&registry.designs)
    }
}