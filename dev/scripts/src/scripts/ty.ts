/**
 * Adapted from https://github.com/paritytech/capi-old copyright Parity Technologies (APACHE License 2.0)
 * Changes August 19th 2023 :
 * - updated to use subshape for scale decoding
 * - adapted from deno to typescript
 *
 Copyright 2023 Parity Technologies

 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.
 */
import * as $ from '@talismn/subshape-fork'

export const $tyId = $.compact($.u32)

export const $field = $.object(
    $.optionalField('name', $.str),
    $.field('ty', $tyId),
    $.optionalField('typeName', $.str),
    $.field('docs', $.array($.str))
)

export const $primitiveKind = $.literalUnion([
    'bool',
    'char',
    'str',
    'u8',
    'u16',
    'u32',
    'u64',
    'u128',
    'u256',
    'i8',
    'i16',
    'i32',
    'i64',
    'i128',
    'i256',
])

export const $struct = $.variant('Struct', $.field('fields', $.array($field)))
export const $union = $.variant(
    'Union',
    $.field(
        'members',
        $.array(
            $.object(
                $.field('name', $.str),
                $.field('fields', $.array($field)),
                $.field('index', $.u8),
                $.field('docs', $.array($.str))
            )
        )
    )
)
export const $sequence = $.variant('Sequence', $.field('typeParam', $tyId))
export const $sizedArray = $.variant('SizedArray', $.field('len', $.u32), $.field('typeParam', $tyId))
export const $tuple = $.variant('Tuple', $.field('fields', $.array($tyId)))
export const $primitive = $.variant('Primitive', $.field('kind', $primitiveKind))
export const $compact = $.variant('Compact', $.field('typeParam', $tyId))
export const $bitSequence = $.variant('BitSequence', $.field('bitOrderType', $tyId), $.field('bitStoreType', $tyId))
export const $tyDef = $.taggedUnion('type', [
    $struct,
    $union,
    $sequence,
    $sizedArray,
    $tuple,
    $primitive,
    $compact,
    $bitSequence,
])

export type Ty = $.Output<typeof $ty>
export const $ty = $.object(
    $.field('id', $.compact($.u32)),
    $.field('path', $.array($.str)),
    $.field('params', $.array($.object($.field('name', $.str), $.optionalField('ty', $tyId)))),
    $tyDef,
    $.field('docs', $.array($.str))
)
