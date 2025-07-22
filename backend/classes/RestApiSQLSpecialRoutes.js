// Frame cart special routes - handles complex frame configurations
// (added as a instance method to the class in RestApiSQL,
//  so we can use the properties from that class here)

function getFrameCartSelect(req) {
  const lang = req.lang || 'en';
  return `
    SELECT * FROM (
      SELECT 
        orderLineId, orderId, quantity, unitPrice, totalPrice, withMat, created,
        animalId, animalName, animalSlug, imageAspectRatio, category,
        frameSpecId, frameSpecName, frameWidthCm, frameHeightCm, 
        imageAreaWidthCm, imageAreaHeightCm, matOpeningWidthCm, matOpeningHeightCm,
        frameMaterialId, materialName, material, color, style,
        priceMultiplier, cssBackground, basePrice,
        'ITEM' as itemType
      FROM orderRowDetails_${lang}
      WHERE orderId = :orderId
      UNION
      SELECT 
        null as orderLineId, id as orderId, totalQuantity as quantity, 
        null as unitPrice, totalAmount as totalPrice, null as withMat, null as created,
        null as animalId, null as animalName, null as animalSlug, 
        null as imageAspectRatio, null as category,
        null as frameSpecId, null as frameSpecName, null as frameWidthCm, null as frameHeightCm,
        null as imageAreaWidthCm, null as imageAreaHeightCm, null as matOpeningWidthCm, null as matOpeningHeightCm,
        null as frameMaterialId, null as materialName, null as material, null as color, null as style,
        null as priceMultiplier, null as cssBackground, null as basePrice,
        itemType
      FROM orderTotals
      WHERE id = :orderId
    )
    ORDER BY 
      CASE WHEN itemType = 'ITEM' THEN 0 ELSE 1 END,
      orderLineId
  `;
}

// Price calculation function
function calculateFramePrice(basePrice, priceMultiplier, withMat = true) {
  let price = basePrice * priceMultiplier;
  // Mat adds 20% to the price (you can adjust this)
  if (withMat) {
    price = price * 1.2;
  }
  return Math.round(price * 100) / 100; // Round to 2 decimals
}

export default function addSpecialRoutes() {

  // Add frame configuration to cart
  this.app.post(this.prefix + 'add-frame-to-cart', async (req, res) => {
    await updateOrderWithUserId.call(this, req);

    let { animalId, frameSpecId, frameMaterialId, withMat, quantity } = req.body || {};
    
    // Validate required fields
    if (!animalId || !frameSpecId || !frameMaterialId) {
      res.json({ error: 'animalId, frameSpecId, and frameMaterialId are required!' });
      return;
    }

    // Set defaults
    withMat = withMat !== false ? 1 : 0; // Convert boolean to integer (1/0)
    quantity = quantity || 1;

    // Get pricing information
    const pricingInfo = await this.db.query('', '', `
      SELECT fp.basePrice, fm.priceMultiplier 
      FROM framePricing fp 
      JOIN frameMaterials fm ON fm.id = :frameMaterialId 
      WHERE fp.frameSpecId = :frameSpecId
    `, { frameSpecId, frameMaterialId });
    if (pricingInfo.length === 0) {
      res.json({ error: 'Invalid frame specification or material combination!' });
      return;
    }

    const { basePrice, priceMultiplier } = pricingInfo[0];
    const unitPrice = calculateFramePrice(basePrice, priceMultiplier, withMat);
    const totalPrice = unitPrice * quantity;

    // Get or create order
    const sessionId = req.sessionID;
    const userId = req.session.user ? req.session.user.id : null;
    let orderId = (await this.db.query('', '',
      'SELECT id FROM orders WHERE paid IS NULL AND (sessionId = :sessionId OR userId = :userId) ORDER BY userId DESC LIMIT 1',
      { sessionId, userId }
    ))[0]?.id;

    if (!orderId) {
      orderId = (await this.db.query('', '',
        'INSERT INTO orders (sessionId, userId) VALUES (:sessionId, :userId)',
        { sessionId, userId }
      )).lastInsertRowid;
    }

    // Check if exact same configuration exists
    let existingItem = (await this.db.query('', '',
      'SELECT * FROM orderLines WHERE orderId = :orderId AND animalId = :animalId AND frameSpecId = :frameSpecId AND frameMaterialId = :frameMaterialId AND withMat = :withMat',
      { orderId, animalId, frameSpecId, frameMaterialId, withMat }
    ))[0];

    if (existingItem) {
      // Update existing item
      const newQuantity = existingItem.quantity + quantity;
      const newTotalPrice = unitPrice * newQuantity;
      
      await this.db.query('', '',
        'UPDATE orderLines SET quantity = :quantity, totalPrice = :totalPrice WHERE id = :id',
        { quantity: newQuantity, totalPrice: newTotalPrice, id: existingItem.id }
      );
    } else {
      // Create new item
      await this.db.query('', '',
        'INSERT INTO orderLines (orderId, animalId, frameSpecId, frameMaterialId, withMat, quantity, unitPrice, totalPrice) VALUES (:orderId, :animalId, :frameSpecId, :frameMaterialId, :withMat, :quantity, :unitPrice, :totalPrice)',
        { orderId, animalId, frameSpecId, frameMaterialId, withMat, quantity, unitPrice, totalPrice }
      );
    }

    // Return updated cart
    const cart = await this.db.query('', '', getFrameCartSelect(req), { orderId });
    
    // Clean up null values from TOTAL items
    const cleanedCart = cart.map(item => {
      if (item.itemType === 'TOTAL') {
        // Remove null properties from TOTAL items
        return Object.fromEntries(
          Object.entries(item).filter(([key, value]) => value !== null)
        );
      }
      return item;
    });
    
    res.json(cleanedCart);
  });

  // Get frame cart
  this.app.get('/api/frame-cart', async (req, res) => {
    await updateOrderWithUserId.call(this, req);
    
    const sessionId = req.sessionID;
    const userId = req.session.user ? req.session.user.id : null;
    
    let orderId = (await this.db.query('', '',
      'SELECT id FROM orders WHERE paid IS NULL AND (sessionId = :sessionId OR userId = :userId) ORDER BY userId DESC LIMIT 1',
      { sessionId, userId }
    ))[0]?.id;

    if (!orderId) {
      res.json({ status: 'The cart is empty.' });
      return;
    }

    const cart = await this.db.query('', '', getFrameCartSelect(req), { orderId });
    
    if (cart.length === 0) {
      res.json({ status: 'The cart is empty.' });
    } else {
      // Clean up null values from TOTAL items
      const cleanedCart = cart.map(item => {
        if (item.itemType === 'TOTAL') {
          // Remove null properties from TOTAL items
          return Object.fromEntries(
            Object.entries(item).filter(([key, value]) => value !== null)
          );
        }
        return item;
      });
      res.json(cleanedCart);
    }
  });

  // Update frame quantity in cart
  this.app.put(this.prefix + 'update-frame-in-cart', async (req, res) => {
    updateOrderWithUserId(req);

    let { orderLineId, quantity } = req.body || {};

    if (!orderLineId || typeof quantity !== 'number') {
      res.json({ error: 'orderLineId and quantity are required!' });
      return;
    }

    const sessionId = req.sessionID;
    const userId = req.session.user ? req.session.user.id : null;

    // Get the order line and verify ownership
    const orderLine = (await this.db.query('', '', `
      SELECT ol.*, o.sessionId, o.userId 
      FROM orderLines ol 
      JOIN orders o ON ol.orderId = o.id 
      WHERE ol.id = :orderLineId AND o.paid IS NULL
    `, { orderLineId }))[0];

    if (!orderLine || (orderLine.sessionId !== sessionId && orderLine.userId !== userId)) {
      res.json({ error: 'Order line not found or access denied!' });
      return;
    }

    if (quantity <= 0) {
      // Remove item
      await this.db.query('', '',
        'DELETE FROM orderLines WHERE id = :orderLineId',
        { orderLineId }
      );
    } else {
      // Update quantity
      const newTotalPrice = orderLine.unitPrice * quantity;
      await this.db.query('', '',
        'UPDATE orderLines SET quantity = :quantity, totalPrice = :totalPrice WHERE id = :orderLineId',
        { quantity, totalPrice: newTotalPrice, orderLineId }
      );
    }

    // Return updated cart
    const cart = await this.db.query('', '', getFrameCartSelect(req), { orderId: orderLine.orderId });
    
    // Clean up null values from TOTAL items
    const cleanedCart = cart.map(item => {
      if (item.itemType === 'TOTAL') {
        // Remove null properties from TOTAL items
        return Object.fromEntries(
          Object.entries(item).filter(([key, value]) => value !== null)
        );
      }
      return item;
    });
    
    res.json(cleanedCart);
  });

  // Remove frame from cart
  this.app.delete(this.prefix + 'remove-frame-from-cart/:orderLineId', async (req, res) => {
    updateOrderWithUserId(req);

    const { orderLineId } = req.params;
    const sessionId = req.sessionID;
    const userId = req.session.user ? req.session.user.id : null;

    // Verify ownership and delete
    const result = await this.db.query('', '', `
      DELETE FROM orderLines 
      WHERE id = :orderLineId 
      AND orderId IN (
        SELECT id FROM orders 
        WHERE paid IS NULL AND (sessionId = :sessionId OR userId = :userId)
      )
    `, { orderLineId, sessionId, userId });

    if (result.changes === 0) {
      res.json({ error: 'Item not found or access denied!' });
      return;
    }

    res.json({ status: 'Item removed from cart.' });
  });

  // Empty frame cart
  this.app.delete('/api/frame-cart', async (req, res) => {
    updateOrderWithUserId(req);

    const sessionId = req.sessionID;
    const userId = req.session.user ? req.session.user.id : null;
    
    let orderId = (await this.db.query('', '',
      'SELECT id FROM orders WHERE paid IS NULL AND (sessionId = :sessionId OR userId = :userId)',
      { sessionId, userId }
    ))[0]?.id;

    if (orderId) {
      await this.db.query('', '',
        'DELETE FROM orderLines WHERE orderId = :orderId',
        { orderId }
      );
    }

    res.json({ status: 'The cart is empty.' });
  });

  // currency exchange rates (usd base)
  this.app.get('/api/exchange-rates', async (_req, res) => {
    let filterTo = ['nok', 'sek'];
    let all = await (await fetch('https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json')).json();
    for (let key in all.usd) {
      filterTo.includes(key) || delete all.usd[key];
    }
    res.json(all);
  });

}

// update orders with user id if we have a logged in user
// and orders with no userId but matching sessionId
async function updateOrderWithUserId(req) {
  const sessionId = req.sessionID;
  const userId = req.session.user ? req.session.user.id : null;
  if (sessionId && userId) {
    await this.db.query(req.method, req.url,
      'UPDATE orders SET userId = :userId WHERE userId IS NULL AND sessionId = :sessionId',
      { sessionId, userId }
    );
  }
}