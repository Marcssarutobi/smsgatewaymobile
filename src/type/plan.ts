export interface Plan {
    id: number;
    name: string;
    price: string; // decimal(10,2) non casté côté back -> string, ex "5000.00"
    currency: string; // ex "XOF"
    sms_quota_monthly: number;
    max_devices: number;
    features: string[] | null
    active: boolean;
    created_at: string;
    updated_at: string;
}