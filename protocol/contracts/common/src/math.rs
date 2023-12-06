pub trait Math
where
    Self: Sized + core::fmt::Debug,
{
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error>;
    fn mul_panic(self, rhs: Self) -> Self {
        self.mul(rhs).unwrap_or_else(|_| {
            panic!("Math error: {:?} * {:?}", stringify!(self), stringify!(rhs))
        })
    }
    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error>;
    fn sub_panic(self, rhs: Self) -> Self {
        self.sub(rhs).unwrap_or_else(|_| {
            panic!("Math error: {:?} - {:?}", stringify!(self), stringify!(rhs))
        })
    }
    fn add(self, rhs: Self) -> Result<Self, crate::common::Error>;
    fn add_panic(self, rhs: Self) -> Self {
        self.add(rhs).unwrap_or_else(|_| {
            panic!("Math error: {:?} + {:?}", stringify!(self), stringify!(rhs))
        })
    }
    fn div(self, rhs: Self) -> Result<Self, crate::common::Error>;
    fn div_panic(self, rhs: Self) -> Self {
        self.div(rhs).unwrap_or_else(|_| {
            panic!("Math error: {:?} / {:?}", stringify!(self), stringify!(rhs))
        })
    }
    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error>;
    fn rem_panic(self, rhs: Self) -> Self {
        self.rem(rhs).unwrap_or_else(|_| {
            panic!("Math error: {:?} % {:?}", stringify!(self), stringify!(rhs))
        })
    }
}

impl Math for u16 {
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_mul(rhs).ok_or(crate::common::Error::Math)
    }

    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_sub(rhs).ok_or(crate::common::Error::Math)
    }

    fn add(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_add(rhs).ok_or(crate::common::Error::Math)
    }

    fn div(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_div(rhs).ok_or(crate::common::Error::Math)
    }

    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_rem(rhs).ok_or(crate::common::Error::Math)
    }
}

impl Math for u32 {
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_mul(rhs).ok_or(crate::common::Error::Math)
    }

    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_sub(rhs).ok_or(crate::common::Error::Math)
    }

    fn add(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_add(rhs).ok_or(crate::common::Error::Math)
    }

    fn div(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_div(rhs).ok_or(crate::common::Error::Math)
    }

    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_rem(rhs).ok_or(crate::common::Error::Math)
    }
}

impl Math for u8 {
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_mul(rhs).ok_or(crate::common::Error::Math)
    }

    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_sub(rhs).ok_or(crate::common::Error::Math)
    }

    fn add(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_add(rhs).ok_or(crate::common::Error::Math)
    }

    fn div(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_div(rhs).ok_or(crate::common::Error::Math)
    }

    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_rem(rhs).ok_or(crate::common::Error::Math)
    }
}

impl Math for u128 {
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_mul(rhs).ok_or(crate::common::Error::Math)
    }

    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_sub(rhs).ok_or(crate::common::Error::Math)
    }

    fn add(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_add(rhs).ok_or(crate::common::Error::Math)
    }

    fn div(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_div(rhs).ok_or(crate::common::Error::Math)
    }

    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_rem(rhs).ok_or(crate::common::Error::Math)
    }
}

impl Math for u64 {
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_mul(rhs).ok_or(crate::common::Error::Math)
    }

    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_sub(rhs).ok_or(crate::common::Error::Math)
    }

    fn add(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_add(rhs).ok_or(crate::common::Error::Math)
    }

    fn div(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_div(rhs).ok_or(crate::common::Error::Math)
    }

    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_rem(rhs).ok_or(crate::common::Error::Math)
    }
}

impl Math for usize {
    fn mul(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_mul(rhs).ok_or(crate::common::Error::Math)
    }

    fn sub(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_sub(rhs).ok_or(crate::common::Error::Math)
    }

    fn add(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_add(rhs).ok_or(crate::common::Error::Math)
    }

    fn div(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_div(rhs).ok_or(crate::common::Error::Math)
    }

    fn rem(self, rhs: Self) -> Result<Self, crate::common::Error> {
        self.checked_rem(rhs).ok_or(crate::common::Error::Math)
    }
}
