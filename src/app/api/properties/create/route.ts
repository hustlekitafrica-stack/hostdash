import { createClient } from '@/lib/supabase/server';
import { propertyBasicSchema, propertyPricingSchema } from '@/lib/validation/property';
import { canCreateProperty } from '@/lib/plan-limits';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: { message: 'Unauthorized' } },
        { status: 401 }
      );
    }

    // Enforce plan-based property limit
    const check = await canCreateProperty(supabase, user.id);
    if (!check.allowed) {
      return NextResponse.json(
        { error: { message: `Starter plan allows up to ${check.limit} properties. Upgrade to Pro for unlimited.` } },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Validate basic info
    const basicData = propertyBasicSchema.parse(body.basic);
    const pricingData = propertyPricingSchema.parse(body.pricing);
    const photoUrls: string[] = Array.isArray(body.photo_urls) ? body.photo_urls : [];

    // Create property
    const { data: property, error: propertyError } = await supabase
      .from('properties')
      .insert({
        user_id: user.id,
        name: basicData.name,
        type: basicData.type,
        description: basicData.description,
        location: basicData.location,
        address: basicData.address,
        city: basicData.city,
        country: basicData.country,
        postal_code: basicData.postalCode,
        base_price: pricingData.basePrice,
        currency: pricingData.currency,
        cleaning_fee: pricingData.cleaningFee || 0,
        security_deposit: pricingData.securityDeposit || 0,
        min_stay: pricingData.minStay,
        max_guests: pricingData.maxGuests,
        status: 'draft',
        ...(photoUrls.length > 0 && { photo_urls: photoUrls }),
      })
      .select()
      .single();

    if (propertyError) {
      return NextResponse.json(
        { error: { message: 'Failed to create property' } },
        { status: 500 }
      );
    }

    return NextResponse.json(
      {
        message: 'Property created successfully',
        property,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json(
        { error: { message: error.message } },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: { message: 'Internal server error' } },
      { status: 500 }
    );
  }
}
