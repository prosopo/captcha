import AsyncFactory from "./AsyncFactory";


interface CarArgs {
    reg: number,
    make: string,
    model: string,
    mileage?: number,
}

class Car extends AsyncFactory<CarArgs> {
    public reg: number
    public make: string
    public model: string
    public mileage: number

    public async init(args: CarArgs) {
        this.reg = args.reg
        this.make = args.make
        this.model = args.model
        this.mileage = args.mileage || 0
        return this
    }
}